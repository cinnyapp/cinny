#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

#[cfg(target_os = "macos")]
mod menu;

fn main() {
  let builder = tauri::Builder::default();

  #[cfg(target_os = "macos")]
  let builder = builder.menu(menu::menu());

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}