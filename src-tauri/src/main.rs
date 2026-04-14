// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use nextiintegrado_lib::commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init()) // Adicione isto
        .plugin(tauri_plugin_dialog::init()) // Adicione isto
        .invoke_handler(tauri::generate_handler![
            commands::get_token,
            commands::get_colaborador,
            commands::get_documents,
            commands::download_docs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
