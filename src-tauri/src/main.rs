// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use nextiintegrado_lib::commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init()) // Adicione isto
        .plugin(tauri_plugin_dialog::init()) // Adicione isto
        .setup(|app| {
            let app_handle = app.handle();
            if let Err(e) = commands::init_db(app_handle) {
                eprintln!("Erro ao inicializar banco de dados SQLite: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_token,
            commands::get_colaborador,
            commands::get_documents,
            commands::download_docs,
            commands::generate_soap_report,
            commands::consult_collaborator_soap,
            commands::save_task_db,
            commands::get_tasks_db,
            commands::get_task_results_db,
            commands::delete_task_db,
            commands::save_pdf_file,
            commands::read_pdf_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
