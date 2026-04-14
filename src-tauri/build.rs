fn main() {
    // Tenta carregar o arquivo .env durante a compilação.
    // Isso lerá o `.env` local e usará os valores para compilar no binário.
    println!("cargo:rerun-if-changed=.env");
    
    if let Ok(_path) = dotenvy::dotenv() {
        for (key, value) in dotenvy::vars() {
            println!("cargo:rustc-env={}={}", key, value);
        }
    }

    tauri_build::build()
}
