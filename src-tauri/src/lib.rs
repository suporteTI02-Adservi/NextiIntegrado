pub mod commands {
    use base64::{engine::general_purpose, Engine as _};
    use reqwest;
    use serde_json::Value;

    #[tauri::command]
    pub async fn get_token() -> Result<String, String> {
        let client = reqwest::Client::new();

        // Variáveis lidas pelo build.rs no momento da compilação, embutidas no binário.
        // Assim, o arquivo .env não precisa (nem deve) ir para produção junto ao build.
        let client_id = option_env!("CLIENT_ID")
            .ok_or("A variável de ambiente CLIENT_ID não foi detectada no momento da compilação.")?
            .to_string();

        let client_secret = option_env!("CLIENT_SECRET")
            .ok_or(
                "A variável de ambiente CLIENT_SECRET não foi detectada no momento da compilação.",
            )?
            .to_string();

        let params = [
            ("grant_type", "client_credentials"),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
        ];

        let res = client
            .post("https://api.nexti.com/security/oauth/token")
            .header(
                "Authorization",
                "Basic YWRzZXJ2aToxY2E1YmRmNTZlYjY4YjNjZjk2Yjc5ZmUxNjdmMTlkMTJkMmExNWZm",
            )
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Erro na requisição: {}", e))?;

        let text = res.text().await.map_err(|e| e.to_string())?;

        let token_data: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| e.to_string())?;

        let token = token_data["access_token"]
            .as_str()
            .ok_or("Token não encontrado na resposta")?
            .to_string();

        Ok(token)
    }

    #[tauri::command]
    pub async fn get_colaborador(external_id: i64) -> Result<Value, String> {
        let client = reqwest::Client::new();
        let empresa = external_id.to_string().chars().next().unwrap();

        let url = format!(
            "https://api.nexti.com/persons/externalid/{}-1-{}",
            empresa, external_id
        );

        let token = get_token().await?;

        let res = client
            .get(url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();
        let text = res.text().await.map_err(|e| e.to_string())?;

        if !status.is_success() {
            return Err(format!("Erro ao buscar colaborador: Status {}", status));
        }

        let data: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

        Ok(data)
    }

    #[tauri::command]
    pub async fn get_documents(id: i32, page: i8, token: String) -> Result<Value, String> {
        let client = reqwest::Client::new();

        // Removidos os parâmetros de segredo da URL, pois o Token já autentica a sessão
        let url = format!("https://adservi.api.nexti.com/core/notices/findsummonsandchecklistbypersonfilter?page={}&size=100", page);

        let body = serde_json::json!({
            "checklistTypeIds": [],
            "noticeTypeIds": [2],
            "personId": id
        });

        let res = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json") // Boa prática incluir
            .body(body.to_string()) // Enviar o corpo como JSON
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();
        let text = res.text().await.map_err(|e| e.to_string())?;

        if !status.is_success() {
            return Err(format!("Erro ao buscar documentos: Status {}", status));
        }

        let data: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        Ok(data)
    }

    #[tauri::command]
    pub async fn download_docs(notice_id: i64, token: String) -> Result<Value, String> {
        let client = reqwest::Client::new();

        let url = "https://adservi.api.nexti.com/report/notice/summonsreceipt";

        let body = serde_json::json!({
            "format":"PDF",
            "idsCustomer":[123],
            "idsNoticePerson":[notice_id]
        });

        let res = client
            .post(url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();

        if !status.is_success() {
            return Err(format!("Erro ao baixar documentos: Status {}", status));
        }
        // Recebe o corpo como bytes
        let bytes = res.bytes().await.map_err(|e| e.to_string())?;

        // Converte para base64
        let encoded = general_purpose::STANDARD.encode(bytes);

        Ok(Value::String(encoded))
    }

    #[tauri::command]
    pub async fn generate_soap_report(xml_payload: String) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = "http://snrsj:8080/g5-senior-services/rubi_Synccom.senior.g5.rh.fp.Relatorios";

        let res = client
            .post(url)
            .header("Content-Type", "text/xml;charset=UTF-8")
            .body(xml_payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();
        let text = res.text().await.map_err(|e| e.to_string())?;

        if !status.is_success() {
            return Err(format!("Erro na requisição SOAP: Status {}\nDetalhes: {}", status, text));
        }

        Ok(text)
    }
    #[tauri::command]
    pub async fn consult_collaborator_soap(xml_payload: String) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = "http://snrsj:8080/g5-senior-services/rubi_Synccom.senior.g5.rh.fp.USUColaborador";

        let res = client
            .post(url)
            .header("Content-Type", "text/xml;charset=UTF-8")
            .body(xml_payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();
        let text = res.text().await.map_err(|e| e.to_string())?;

        if !status.is_success() {
            return Err(format!("Erro na requisição SOAP (USUColaborador): Status {}\nDetalhes: {}", status, text));
        }

        Ok(text)
    }

    use tauri::{AppHandle, Manager};
    use rusqlite::{Connection, params};
    use std::path::PathBuf;

    fn get_db_path(app_handle: &AppHandle) -> PathBuf {
        let mut path = app_handle.path().app_data_dir().unwrap_or_else(|_| {
            std::env::current_dir().unwrap_or_default()
        });
        // Certifica que a pasta de dados do app existe
        let _ = std::fs::create_dir_all(&path);
        path.push("nexti_integrado.db");
        path
    }

    pub fn init_db(app_handle: &AppHandle) -> Result<(), String> {
        let db_path = get_db_path(app_handle);
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                task_type TEXT NOT NULL,
                matricula TEXT NOT NULL,
                nome TEXT,
                status TEXT NOT NULL,
                step TEXT NOT NULL,
                error_msg TEXT,
                results_json TEXT,
                updated_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    #[tauri::command]
    pub async fn save_task_db(
        app_handle: AppHandle,
        id: String,
        task_type: String,
        matricula: String,
        nome: Option<String>,
        status: String,
        step: String,
        error_msg: Option<String>,
        results_json: Option<String>,
    ) -> Result<(), String> {
        let db_path = get_db_path(&app_handle);
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        if results_json.is_some() {
            conn.execute(
                "INSERT INTO tasks (id, task_type, matricula, nome, status, step, error_msg, results_json, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                 ON CONFLICT(id) DO UPDATE SET
                    nome = excluded.nome,
                    status = excluded.status,
                    step = excluded.step,
                    error_msg = excluded.error_msg,
                    results_json = excluded.results_json,
                    updated_at = excluded.updated_at",
                params![id, task_type, matricula, nome, status, step, error_msg, results_json, now],
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "INSERT INTO tasks (id, task_type, matricula, nome, status, step, error_msg, results_json, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    nome = excluded.nome,
                    status = excluded.status,
                    step = excluded.step,
                    error_msg = excluded.error_msg,
                    updated_at = excluded.updated_at",
                params![id, task_type, matricula, nome, status, step, error_msg, now],
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    #[tauri::command]
    pub async fn get_tasks_db(app_handle: AppHandle) -> Result<serde_json::Value, String> {
        let db_path = get_db_path(&app_handle);
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        let mut stmt = conn
            .prepare("SELECT id, task_type, matricula, nome, status, step, error_msg, updated_at FROM tasks ORDER BY updated_at DESC")
            .map_err(|e| e.to_string())?;
            
        let task_iter = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let task_type: String = row.get(1)?;
            let matricula: String = row.get(2)?;
            let nome: Option<String> = row.get(3)?;
            let status: String = row.get(4)?;
            let step: String = row.get(5)?;
            let error_msg: Option<String> = row.get(6)?;
            let updated_at: i64 = row.get(7)?;
            
            Ok(serde_json::json!({
                "id": id,
                "task_type": task_type,
                "matricula": matricula,
                "nome": nome,
                "status": status,
                "step": step,
                "error_msg": error_msg,
                "updated_at": updated_at
            }))
        }).map_err(|e| e.to_string())?;

        let mut tasks = Vec::new();
        for task in task_iter {
            tasks.push(task.map_err(|e| e.to_string())?);
        }

        Ok(serde_json::Value::Array(tasks))
    }

    #[tauri::command]
    pub async fn get_task_results_db(app_handle: AppHandle, id: String) -> Result<Option<String>, String> {
        let db_path = get_db_path(&app_handle);
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        let mut stmt = conn
            .prepare("SELECT results_json FROM tasks WHERE id = ?1")
            .map_err(|e| e.to_string())?;
            
        let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let results_json: Option<String> = row.get(0).map_err(|e| e.to_string())?;
            Ok(results_json)
        } else {
            Ok(None)
        }
    }

    #[tauri::command]
    pub async fn delete_task_db(app_handle: AppHandle, id: String) -> Result<(), String> {
        let db_path = get_db_path(&app_handle);
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
            
        Ok(())
    }

    /// Salva um PDF (recebido como base64) em disco, retornando o caminho absoluto.
    /// Armazena em {app_data_dir}/pdfs/{sub_folder}/{file_name}
    #[tauri::command]
    pub async fn save_pdf_file(
        app_handle: AppHandle,
        base64_data: String,
        file_name: String,
        sub_folder: String,
    ) -> Result<String, String> {
        let mut dir = app_handle.path().app_data_dir().unwrap_or_else(|_| {
            std::env::current_dir().unwrap_or_default()
        });
        dir.push("pdfs");
        dir.push(&sub_folder);
        let _ = std::fs::create_dir_all(&dir);

        dir.push(&file_name);

        let bytes = general_purpose::STANDARD
            .decode(base64_data.replace("\r", "").replace("\n", "").replace(" ", ""))
            .map_err(|e| format!("Erro ao decodificar base64: {}", e))?;

        std::fs::write(&dir, &bytes)
            .map_err(|e| format!("Erro ao salvar arquivo PDF: {}", e))?;

        Ok(dir.to_string_lossy().to_string())
    }

    /// Lê um arquivo PDF do disco e retorna seu conteúdo como base64.
    #[tauri::command]
    pub async fn read_pdf_file(file_path: String) -> Result<String, String> {
        let bytes = std::fs::read(&file_path)
            .map_err(|e| format!("Erro ao ler arquivo PDF '{}': {}", file_path, e))?;

        let encoded = general_purpose::STANDARD.encode(&bytes);
        Ok(encoded)
    }
}

