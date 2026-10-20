use tauri::{
    menu::{Menu, MenuItem, Submenu},
    AppHandle, Manager, Runtime,
};

fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about_item = MenuItem::with_id(app, "about", "About ProTrack", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit ProTrack", true, Some("CmdOrCtrl+Q"))?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;

    let app_menu = Submenu::with_items(app, "ProTrack", true, &[&about_item, &quit_item])?;
    let file_menu = Submenu::with_items(app, "File", true, &[&settings_item])?;

    // On macOS the system injects its own "Enter Full Screen" item (⌃⌘F) into
    // the View menu, so leave it empty to avoid a duplicate. Other platforms
    // need an explicit item.
    #[cfg(target_os = "macos")]
    let view_menu = Submenu::new(app, "View", true)?;

    #[cfg(not(target_os = "macos"))]
    let view_menu = {
        let fullscreen_item =
            MenuItem::with_id(app, "fullscreen", "Toggle Full Screen", true, Some("F11"))?;
        Submenu::with_items(app, "View", true, &[&fullscreen_item])?
    };

    Menu::with_items(app, &[&app_menu, &file_menu, &view_menu])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .menu(build_menu)
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
