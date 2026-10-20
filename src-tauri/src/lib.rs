use tauri::{menu::{Menu, MenuItem, Submenu}, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let about_item = MenuItem::with_id(app, "about", "About ProTrack", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit ProTrack", true, Some("CmdOrCtrl+Q"))?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;

            #[cfg(target_os = "macos")]
            let fullscreen_accel = Some("Ctrl+Command+F");
            #[cfg(not(target_os = "macos"))]
            let fullscreen_accel = Some("F11");
            let fullscreen_item =
                MenuItem::with_id(app, "fullscreen", "Toggle Full Screen", true, fullscreen_accel)?;

            let app_menu = Submenu::with_items(app, "ProTrack", true, &[&about_item, &quit_item])?;
            let file_menu = Submenu::with_items(app, "File", true, &[&settings_item])?;
            let view_menu = Submenu::with_items(app, "View", true, &[&fullscreen_item])?;

            let menu = Menu::with_items(app, &[&app_menu, &file_menu, &view_menu])?;
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "about" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.eval("document.getElementById('about-dialog').showModal();");
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.eval("openSettings();");
                    }
                }
                "fullscreen" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let is_fullscreen = window.is_fullscreen().unwrap_or(false);
                        let _ = window.set_fullscreen(!is_fullscreen);
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
