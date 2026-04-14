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
}
