use tauri::{menu::{Menu, MenuItem, Submenu}, Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let about_item = MenuItem::with_id(app, "about", "About ProTrack", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit ProTrack", true, Some("CmdOrCtrl+Q"))?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;

            let app_menu = Submenu::with_items(app, "ProTrack", true, &[&about_item, &quit_item])?;
            let file_menu = Submenu::with_items(app, "File", true, &[&settings_item])?;

            let menu = Menu::with_items(app, &[&app_menu, &file_menu])?;
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "about" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-about", ());
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-settings", ());
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
