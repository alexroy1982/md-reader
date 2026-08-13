use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{Emitter, Listener, Manager, WebviewWindow};

/// 前端就绪门控：Tauri 事件不排队，前端未完成 listen 前 emit 的 open-file 会丢失。
/// 就绪前把路径存入 pending，由 'frontend-ready' 统一触发 emit。
struct FrontendState {
    ready: AtomicBool,
    pending: Mutex<Option<String>>,
}

fn extract_markdown_path(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|a| {
            let l = a.to_lowercase();
            l.ends_with(".md") || l.ends_with(".markdown")
        })
        .cloned()
}

/// 就绪则直接 emit，否则暂存 pending。
/// 锁内检查 ready，与 frontend-ready 处理（锁内置位 + 取 pending）配对，避免检查与暂存之间的竞态丢事件。
fn emit_or_stash(window: &WebviewWindow, state: &FrontendState, path: String) {
    let mut guard = state.pending.lock().unwrap();
    if state.ready.load(Ordering::SeqCst) {
        drop(guard);
        let _ = window.emit("open-file", path);
    } else {
        *guard = Some(path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(FrontendState {
            ready: AtomicBool::new(false),
            pending: Mutex::new(None),
        })
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // 二次启动：聚焦已有窗口，若有 .md 参数则发给前端开新标签（未就绪则暂存）
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
                if let Some(path) = extract_markdown_path(&argv) {
                    emit_or_stash(&window, &app.state::<FrontendState>(), path);
                }
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 首次启动带文件参数（双击 .md 冷启动）：与二次实例同走 pending 机制
            let args: Vec<String> = std::env::args().collect();
            if let Some(path) = extract_markdown_path(&args) {
                *app.state::<FrontendState>().pending.lock().unwrap() = Some(path);
            }
            // 前端就绪：置位 ready 并补发 pending 中的路径
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                let handle = app.handle().clone();
                app.listen("frontend-ready", move |_| {
                    let state = handle.state::<FrontendState>();
                    let path = {
                        let mut guard = state.pending.lock().unwrap();
                        state.ready.store(true, Ordering::SeqCst);
                        guard.take()
                    };
                    if let Some(path) = path {
                        let _ = win.emit("open-file", path);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
