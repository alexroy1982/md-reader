use tauri::{Emitter, Listener, Manager};

fn extract_markdown_path(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|a| {
            let l = a.to_lowercase();
            l.ends_with(".md") || l.ends_with(".markdown")
        })
        .cloned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // 二次启动：聚焦已有窗口，若有 .md 参数则发给前端开新标签
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
                if let Some(path) = extract_markdown_path(&argv) {
                    let _ = window.emit("open-file", path);
                }
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 首次启动带文件参数（双击 .md 冷启动）：等前端就绪后再发事件
            let args: Vec<String> = std::env::args().collect();
            if let Some(path) = extract_markdown_path(&args) {
                if let Some(window) = app.get_webview_window("main") {
                    let win = window.clone();
                    app.listen("frontend-ready", move |_| {
                        let _ = win.emit("open-file", path.clone());
                    });
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
