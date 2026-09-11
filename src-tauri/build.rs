fn main() {
    // O manifest do Cargo fica em src-tauri, enquanto o .env pertence à raiz.
    // Use um caminho explícito para dev e release lerem exatamente o mesmo arquivo.
    let env_path = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join(".env");
    println!("cargo:rerun-if-changed={}", env_path.display());

    if dotenvy::from_path(&env_path).is_ok() {
        const BUILD_VARIABLES: [&str; 7] = [
            "SENIOR_USER",
            "SENIOR_PASS",
            "CLIENT_ID",
            "CLIENT_SECRET",
            "AUTH_TOKEN",
            "VITE_CF_CLIENT_ID",
            "VITE_CF_CLIENT_SECRET",
        ];
        for key in BUILD_VARIABLES {
            if let Ok(value) = std::env::var(key) {
                println!("cargo:rustc-env={}={}", key, value);
            }
        }
    }

    tauri_build::build()
}
