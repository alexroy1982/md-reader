use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{Emitter, Listener, Manager, WebviewWindow};
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2_16, COREWEBVIEW2_PRINT_DIALOG_KIND_SYSTEM,
};
use windows::core::Interface;

/// window.print() 在 WebView2 静默无效；改为调 WebView2 原生打印对话框。
/// with_webview 闭包必须返回 ()，结果经 mpsc 通道传出，错误全部回传前端。
#[tauri::command]
fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel();
    window
        .with_webview(move |webview| unsafe {
            let result = (|| {
                let controller = webview.controller();
                let core = controller.CoreWebView2().map_err(|e| e.to_string())?;
                let core16: ICoreWebView2_16 = core.cast().map_err(|e| e.to_string())?;
                core16
                    .ShowPrintUI(COREWEBVIEW2_PRINT_DIALOG_KIND_SYSTEM)
                    .map_err(|e| e.to_string())?;
                Ok::<(), String>(())
            })();
            let _ = tx.send(result);
        })
        .map_err(|e| e.to_string())?;
    rx.recv().map_err(|e| e.to_string())?
}

/// 前端就绪门控：Tauri 事件不排队，前端未完成 listen 前 emit 的 open-file 会丢失。
/// 就绪前把路径存入 pending 队列，由 'frontend-ready' 统一触发依次 emit。
struct FrontendState {
    ready: AtomicBool,
    pending: Mutex<Vec<String>>,
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

/// 就绪则直接 emit，否则入队 pending。
/// 锁内检查 ready，与 frontend-ready 处理（锁内置位 + 取 pending）配对，避免检查与暂存之间的竞态丢事件。
fn emit_or_stash(window: &WebviewWindow, state: &FrontendState, path: String) {
    let mut guard = state.pending.lock().unwrap();
    if state.ready.load(Ordering::SeqCst) {
        drop(guard);
        let _ = window.emit("open-file", path);
    } else {
        guard.push(path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(FrontendState {
            ready: AtomicBool::new(false),
            pending: Mutex::new(Vec::new()),
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
        .invoke_handler(tauri::generate_handler![print_page])
        .setup(|app| {
            // 首次启动带文件参数（双击 .md 冷启动）：与二次实例同走 pending 队列
            let args: Vec<String> = std::env::args().collect();
            if let Some(path) = extract_markdown_path(&args) {
                app.state::<FrontendState>().pending.lock().unwrap().push(path);
            }
            // 前端就绪：置位 ready 并依次补发 pending 队列中的所有路径
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                let handle = app.handle().clone();
                app.listen("frontend-ready", move |_| {
                    let state = handle.state::<FrontendState>();
                    let paths = {
                        let mut guard = state.pending.lock().unwrap();
                        state.ready.store(true, Ordering::SeqCst);
                        std::mem::take(&mut *guard)
                    };
                    for path in paths {
                        let _ = win.emit("open-file", path);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 进程已运行毫秒数：前端用它换算「进程启动 → 页面加载」的冷启动间隙（WebView2 拉起成本）
#[tauri::command]
fn uptime_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}
