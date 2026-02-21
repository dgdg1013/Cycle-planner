use rfd::FileDialog;
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuEvent, MenuItem};
use tauri::tray::{MouseButton, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{LogicalSize, Manager, Size, WindowEvent};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::COLORREF;
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW, GWL_EXSTYLE, LWA_ALPHA,
    WS_EX_LAYERED,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CycleMeta {
    id: String,
    name: String,
    created_at: String,
    folder_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IndexData {
    cycles: Vec<CycleMeta>,
    selected_cycle_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CycleData {
    id: String,
    name: String,
    created_at: String,
    goals: Vec<Value>,
    works: Vec<Value>,
    tasks: Vec<Value>,
}

const DEFAULT_WINDOW_WIDTH: f64 = 1320.0;
const DEFAULT_WINDOW_HEIGHT: f64 = 860.0;
const POST_IT_WINDOW_WIDTH: f64 = 390.0;
const POST_IT_WINDOW_HEIGHT: f64 = 560.0;
const CALENDAR_WINDOW_WIDTH: f64 = 1080.0;
const CALENDAR_WINDOW_HEIGHT: f64 = 760.0;

#[derive(Debug, Clone, Copy)]
struct NormalWindowState {
    width: f64,
    height: f64,
    was_maximized: bool,
}

struct DesktopWindowState {
    post_it_mode: Mutex<bool>,
    calendar_mode: Mutex<bool>,
    normal_window_state: Mutex<Option<NormalWindowState>>,
    window_opacity: Mutex<f64>,
}

impl Default for DesktopWindowState {
    fn default() -> Self {
        Self {
            post_it_mode: Mutex::new(false),
            calendar_mode: Mutex::new(false),
            normal_window_state: Mutex::new(None),
            window_opacity: Mutex::new(1.0),
        }
    }
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    format!("{}", ts)
}

fn uid(prefix: &str) -> String {
    let rand = format!("{:x}", rand::random::<u64>());
    format!("{}_{}", prefix, rand)
}

fn sanitize_folder_name(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        if ch.is_alphanumeric() || ch == '-' || ch == '_' {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    let trimmed = out.trim_matches('_').to_string();
    if trimmed.is_empty() {
        "cycle".to_string()
    } else {
        trimmed
    }
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("app config dir error: {e}"))?;
    let dir = base.join("cycle-planner");
    fs::create_dir_all(&dir).map_err(|e| format!("create app dir error: {e}"))?;
    Ok(dir)
}

fn index_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("index.json"))
}

fn cycle_file_path(folder: &str) -> PathBuf {
    Path::new(folder).join("cycle_data.json")
}

fn normalize_display_path(path: &str) -> String {
    #[cfg(windows)]
    {
        if let Some(stripped) = path.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{}", stripped);
        }
        if let Some(stripped) = path.strip_prefix(r"\\?\") {
            return stripped.to_string();
        }
    }
    path.to_string()
}

fn read_index(app: &tauri::AppHandle) -> Result<IndexData, String> {
    let path = index_file_path(app)?;
    if !path.exists() {
        return Ok(IndexData {
            cycles: vec![],
            selected_cycle_id: None,
        });
    }

    let raw = fs::read_to_string(path).map_err(|e| format!("read index error: {e}"))?;
    let mut index = serde_json::from_str::<IndexData>(&raw).map_err(|e| format!("parse index error: {e}"))?;
    for cycle in &mut index.cycles {
        cycle.folder_path = normalize_display_path(&cycle.folder_path);
    }
    Ok(index)
}

fn write_index(app: &tauri::AppHandle, index: &IndexData) -> Result<(), String> {
    let path = index_file_path(app)?;
    let raw = serde_json::to_string_pretty(index).map_err(|e| format!("serialize index error: {e}"))?;
    fs::write(path, raw).map_err(|e| format!("write index error: {e}"))
}

fn ensure_cycle_data(cycle: &CycleMeta) -> Result<CycleData, String> {
    let file = cycle_file_path(&cycle.folder_path);
    if !file.exists() {
        let data = CycleData {
            id: cycle.id.clone(),
            name: cycle.name.clone(),
            created_at: cycle.created_at.clone(),
            goals: vec![],
            works: vec![],
            tasks: vec![],
        };
        let raw = serde_json::to_string_pretty(&data).map_err(|e| format!("serialize cycle data error: {e}"))?;
        fs::create_dir_all(Path::new(&cycle.folder_path)).map_err(|e| format!("create cycle dir error: {e}"))?;
        fs::write(file, raw).map_err(|e| format!("write cycle data error: {e}"))?;
        return Ok(data);
    }

    let raw = fs::read_to_string(&file).map_err(|e| format!("read cycle data error: {e}"))?;
    let mut data = serde_json::from_str::<CycleData>(&raw).map_err(|e| format!("parse cycle data error: {e}"))?;
    if data.id.is_empty() {
        data.id = cycle.id.clone();
    }
    if data.name.is_empty() {
        data.name = cycle.name.clone();
    }
    if data.created_at.is_empty() {
        data.created_at = cycle.created_at.clone();
    }
    Ok(data)
}

fn write_cycle_data(cycle: &CycleMeta, data: &CycleData) -> Result<(), String> {
    let file = cycle_file_path(&cycle.folder_path);
    fs::create_dir_all(Path::new(&cycle.folder_path)).map_err(|e| format!("create cycle dir error: {e}"))?;
    let raw = serde_json::to_string_pretty(data).map_err(|e| format!("serialize cycle data error: {e}"))?;
    fs::write(file, raw).map_err(|e| format!("write cycle data error: {e}"))
}

fn find_cycle(index: &IndexData, cycle_id: &str) -> Option<CycleMeta> {
    index.cycles.iter().find(|c| c.id == cycle_id).cloned()
}

fn main_window(app: &tauri::AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "Main window was not found.".to_string())
}

#[cfg(target_os = "windows")]
fn apply_window_opacity(window: &tauri::WebviewWindow, opacity: f64) -> Result<(), String> {
    let window_handle = window
        .window_handle()
        .map_err(|e| format!("Failed to get window handle: {e}"))?;
    let hwnd = match window_handle.as_raw() {
        RawWindowHandle::Win32(handle) => HWND(handle.hwnd.get() as _),
        _ => return Err("Unsupported window handle type for opacity.".to_string()),
    };
    let alpha = (opacity * 255.0).round() as u8;
    unsafe {
        let current_exstyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        if (current_exstyle & WS_EX_LAYERED.0) == 0 {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, (current_exstyle | WS_EX_LAYERED.0) as _);
        }
        SetLayeredWindowAttributes(hwnd, COLORREF(0), alpha, LWA_ALPHA)
            .map_err(|e| format!("Failed to apply window opacity: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn pick_folder() -> Option<String> {
    FileDialog::new().pick_folder().map(|p| {
        let canonical = fs::canonicalize(&p)
            .unwrap_or(p)
            .to_string_lossy()
            .to_string();
        normalize_display_path(&canonical)
    })
}

#[tauri::command]
fn load_index(app: tauri::AppHandle) -> Result<IndexData, String> {
    read_index(&app)
}

#[tauri::command]
#[allow(non_snake_case)]
fn select_cycle(app: tauri::AppHandle, cycleId: String) -> Result<IndexData, String> {
    let mut index = read_index(&app)?;
    if find_cycle(&index, &cycleId).is_none() {
        return Err("Selected Cycle does not exist.".to_string());
    }
    index.selected_cycle_id = Some(cycleId);
    write_index(&app, &index)?;
    Ok(index)
}

#[tauri::command]
#[allow(non_snake_case)]
fn create_cycle(app: tauri::AppHandle, name: String, parentDir: String) -> Result<IndexData, String> {
    let parent = Path::new(&parentDir);
    if !parent.exists() || !parent.is_dir() {
        return Err("The selected parent folder is not valid.".to_string());
    }

    let mut index = read_index(&app)?;
    let cycle_id = uid("cycle");
    let suffix = cycle_id.chars().rev().take(6).collect::<String>().chars().rev().collect::<String>();
    let folder_name = format!("{}_{}", sanitize_folder_name(&name), suffix);
    let folder_path = parent.join(folder_name);
    fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create cycle folder: {e}"))?;

    let meta = CycleMeta {
        id: cycle_id.clone(),
        name,
        created_at: now_iso(),
        folder_path: normalize_display_path(&folder_path.to_string_lossy()),
    };

    let data = CycleData {
        id: meta.id.clone(),
        name: meta.name.clone(),
        created_at: meta.created_at.clone(),
        goals: vec![],
        works: vec![],
        tasks: vec![],
    };

    write_cycle_data(&meta, &data)?;
    index.cycles.push(meta);
    if index.selected_cycle_id.is_none() {
        index.selected_cycle_id = Some(cycle_id);
    }
    write_index(&app, &index)?;
    Ok(index)
}

#[tauri::command]
#[allow(non_snake_case)]
fn import_cycle(app: tauri::AppHandle, folderPath: String) -> Result<IndexData, String> {
    let file = cycle_file_path(&folderPath);
    if !file.exists() {
        return Err("cycle_data.json was not found.".to_string());
    }

    let raw = fs::read_to_string(&file).map_err(|e| format!("read import cycle data error: {e}"))?;
    let mut data = serde_json::from_str::<CycleData>(&raw).map_err(|e| format!("parse import cycle data error: {e}"))?;

    if data.id.is_empty() {
        data.id = uid("cycle");
    }
    if data.name.is_empty() {
        data.name = "Imported Cycle".to_string();
    }
    if data.created_at.is_empty() {
        data.created_at = now_iso();
    }

    let mut index = read_index(&app)?;
    if let Some(existing) = index.cycles.iter_mut().find(|c| c.id == data.id) {
        existing.name = data.name.clone();
        existing.folder_path = normalize_display_path(&folderPath);
        existing.created_at = data.created_at.clone();
    } else {
        index.cycles.push(CycleMeta {
            id: data.id.clone(),
            name: data.name.clone(),
            created_at: data.created_at.clone(),
            folder_path: normalize_display_path(&folderPath),
        });
    }

    index.selected_cycle_id = Some(data.id.clone());

    let selected = find_cycle(&index, &data.id).ok_or_else(|| "Failed to register cycle.".to_string())?;
    write_cycle_data(&selected, &data)?;
    write_index(&app, &index)?;
    Ok(index)
}

#[tauri::command]
#[allow(non_snake_case)]
fn load_cycle_data(app: tauri::AppHandle, cycleId: String) -> Result<CycleData, String> {
    let index = read_index(&app)?;
    let cycle = find_cycle(&index, &cycleId).ok_or_else(|| "Cycle was not found.".to_string())?;
    ensure_cycle_data(&cycle)
}

#[tauri::command]
#[allow(non_snake_case)]
fn save_cycle_data(app: tauri::AppHandle, cycleId: String, data: CycleData) -> Result<(), String> {
    let index = read_index(&app)?;
    let cycle = find_cycle(&index, &cycleId).ok_or_else(|| "Cycle was not found.".to_string())?;
    let mut next = data;
    next.id = cycle.id.clone();
    next.name = cycle.name.clone();
    if next.created_at.is_empty() {
        next.created_at = cycle.created_at.clone();
    }
    write_cycle_data(&cycle, &next)
}

#[tauri::command]
fn window_minimize(app: tauri::AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window.minimize().map_err(|e| format!("Failed to minimize window: {e}"))
}

#[tauri::command]
fn window_toggle_maximize(app: tauri::AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    let is_maximized = window
        .is_maximized()
        .map_err(|e| format!("Failed to read window state: {e}"))?;
    if is_maximized {
        window.unmaximize().map_err(|e| format!("Failed to restore window: {e}"))
    } else {
        window.maximize().map_err(|e| format!("Failed to maximize window: {e}"))
    }
}

#[tauri::command]
fn window_close(app: tauri::AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window.hide().map_err(|e| format!("Failed to hide window: {e}"))
}

#[tauri::command]
fn window_start_dragging(app: tauri::AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window
        .start_dragging()
        .map_err(|e| format!("Failed to start dragging window: {e}"))
}

#[tauri::command]
fn window_is_always_on_top(app: tauri::AppHandle) -> Result<bool, String> {
    let window = main_window(&app)?;
    window
        .is_always_on_top()
        .map_err(|e| format!("Failed to get always-on-top state: {e}"))
}

#[tauri::command]
fn window_toggle_always_on_top(
    app: tauri::AppHandle,
    state: tauri::State<DesktopWindowState>,
) -> Result<bool, String> {
    let window = main_window(&app)?;
    let current = window
        .is_always_on_top()
        .map_err(|e| format!("Failed to get always-on-top state: {e}"))?;
    let next = !current;
    window
        .set_always_on_top(next)
        .map_err(|e| format!("Failed to set always-on-top state: {e}"))?;

    #[cfg(target_os = "windows")]
    {
        let opacity = *state
            .window_opacity
            .lock()
            .map_err(|_| "Failed to read window opacity state.".to_string())?;
        apply_window_opacity(&window, opacity)?;
    }

    Ok(next)
}

#[tauri::command]
fn window_get_opacity(state: tauri::State<DesktopWindowState>) -> Result<f64, String> {
    let opacity = state
        .window_opacity
        .lock()
        .map_err(|_| "Failed to read window opacity state.".to_string())?;
    Ok(*opacity)
}

#[tauri::command]
fn window_set_opacity(
    app: tauri::AppHandle,
    state: tauri::State<DesktopWindowState>,
    opacity: f64,
) -> Result<f64, String> {
    let window = main_window(&app)?;
    let next = opacity.clamp(0.5, 1.0);

    #[cfg(target_os = "windows")]
    {
        apply_window_opacity(&window, next)?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window;
    }

    let mut stored = state
        .window_opacity
        .lock()
        .map_err(|_| "Failed to update window opacity state.".to_string())?;
    *stored = next;
    Ok(next)
}

#[tauri::command]
fn window_is_post_it_mode(state: tauri::State<DesktopWindowState>) -> Result<bool, String> {
    let mode = state
        .post_it_mode
        .lock()
        .map_err(|_| "Failed to read post-it mode state.".to_string())?;
    Ok(*mode)
}

#[tauri::command]
fn window_toggle_post_it_mode(
    app: tauri::AppHandle,
    state: tauri::State<DesktopWindowState>,
) -> Result<bool, String> {
    let window = main_window(&app)?;
    let current_opacity = *state
        .window_opacity
        .lock()
        .map_err(|_| "Failed to read window opacity state.".to_string())?;
    let mut post_it_mode = state
        .post_it_mode
        .lock()
        .map_err(|_| "Failed to update post-it mode state.".to_string())?;
    let mut calendar_mode = state
        .calendar_mode
        .lock()
        .map_err(|_| "Failed to update calendar mode state.".to_string())?;

    if !*post_it_mode {
        let is_maximized = window
            .is_maximized()
            .map_err(|e| format!("Failed to read window state: {e}"))?;
        let inner_size = window
            .inner_size()
            .map_err(|e| format!("Failed to read window size: {e}"))?;

        {
            let mut normal_state = state
                .normal_window_state
                .lock()
                .map_err(|_| "Failed to store normal window state.".to_string())?;
            *normal_state = Some(NormalWindowState {
                width: inner_size.width as f64,
                height: inner_size.height as f64,
                was_maximized: is_maximized,
            });
        }

        if is_maximized {
            window
                .unmaximize()
                .map_err(|e| format!("Failed to restore window from maximized state: {e}"))?;
        }

        window
            .set_size(Size::Logical(LogicalSize::new(
                POST_IT_WINDOW_WIDTH,
                POST_IT_WINDOW_HEIGHT,
            )))
            .map_err(|e| format!("Failed to enter post-it mode size: {e}"))?;

        window
            .set_always_on_top(true)
            .map_err(|e| format!("Failed to enable always-on-top for post-it mode: {e}"))?;

        #[cfg(target_os = "windows")]
        apply_window_opacity(&window, current_opacity)?;

        *calendar_mode = false;
        *post_it_mode = true;
        return Ok(true);
    }

    let saved = {
        let mut normal_state = state
            .normal_window_state
            .lock()
            .map_err(|_| "Failed to load normal window state.".to_string())?;
        normal_state.take()
    };

    if let Some(previous) = saved {
        window
            .set_size(Size::Logical(LogicalSize::new(previous.width, previous.height)))
            .map_err(|e| format!("Failed to restore window size: {e}"))?;
        if previous.was_maximized {
            window
                .maximize()
                .map_err(|e| format!("Failed to re-maximize window: {e}"))?;
        }
    } else {
        window
            .set_size(Size::Logical(LogicalSize::new(
                DEFAULT_WINDOW_WIDTH,
                DEFAULT_WINDOW_HEIGHT,
            )))
            .map_err(|e| format!("Failed to restore default window size: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    apply_window_opacity(&window, current_opacity)?;

    *post_it_mode = false;
    Ok(false)
}

#[tauri::command]
fn window_is_calendar_mode(state: tauri::State<DesktopWindowState>) -> Result<bool, String> {
    let mode = state
        .calendar_mode
        .lock()
        .map_err(|_| "Failed to read calendar mode state.".to_string())?;
    Ok(*mode)
}

#[tauri::command]
fn window_toggle_calendar_mode(
    app: tauri::AppHandle,
    state: tauri::State<DesktopWindowState>,
) -> Result<bool, String> {
    let window = main_window(&app)?;
    let current_opacity = *state
        .window_opacity
        .lock()
        .map_err(|_| "Failed to read window opacity state.".to_string())?;

    let mut calendar_mode = state
        .calendar_mode
        .lock()
        .map_err(|_| "Failed to update calendar mode state.".to_string())?;
    let mut post_it_mode = state
        .post_it_mode
        .lock()
        .map_err(|_| "Failed to update post-it mode state.".to_string())?;

    if !*calendar_mode {
        let is_maximized = window
            .is_maximized()
            .map_err(|e| format!("Failed to read window state: {e}"))?;
        let inner_size = window
            .inner_size()
            .map_err(|e| format!("Failed to read window size: {e}"))?;

        {
            let mut normal_state = state
                .normal_window_state
                .lock()
                .map_err(|_| "Failed to store normal window state.".to_string())?;
            if normal_state.is_none() {
                *normal_state = Some(NormalWindowState {
                    width: inner_size.width as f64,
                    height: inner_size.height as f64,
                    was_maximized: is_maximized,
                });
            }
        }

        if is_maximized {
            window
                .unmaximize()
                .map_err(|e| format!("Failed to restore window from maximized state: {e}"))?;
        }

        window
            .set_size(Size::Logical(LogicalSize::new(
                CALENDAR_WINDOW_WIDTH,
                CALENDAR_WINDOW_HEIGHT,
            )))
            .map_err(|e| format!("Failed to enter calendar mode size: {e}"))?;

        #[cfg(target_os = "windows")]
        apply_window_opacity(&window, current_opacity)?;

        *post_it_mode = false;
        *calendar_mode = true;
        return Ok(true);
    }

    let saved = {
        let mut normal_state = state
            .normal_window_state
            .lock()
            .map_err(|_| "Failed to load normal window state.".to_string())?;
        normal_state.take()
    };

    if let Some(previous) = saved {
        window
            .set_size(Size::Logical(LogicalSize::new(previous.width, previous.height)))
            .map_err(|e| format!("Failed to restore window size: {e}"))?;
        if previous.was_maximized {
            window
                .maximize()
                .map_err(|e| format!("Failed to re-maximize window: {e}"))?;
        }
    } else {
        window
            .set_size(Size::Logical(LogicalSize::new(
                DEFAULT_WINDOW_WIDTH,
                DEFAULT_WINDOW_HEIGHT,
            )))
            .map_err(|e| format!("Failed to restore default window size: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    apply_window_opacity(&window, current_opacity)?;

    *calendar_mode = false;
    Ok(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DesktopWindowState::default())
        .setup(|app| {
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
                .map_err(|e| format!("Failed to create tray menu item: {e}"))?;
            let tray_menu = Menu::with_items(app, &[&quit_item])
                .map_err(|e| format!("Failed to create tray menu: {e}"))?;

            let tray_icon = app
                .default_window_icon()
                .ok_or_else(|| "Default window icon is missing.".to_string())?
                .clone();

            TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app: &tauri::AppHandle, event: MenuEvent| {
                    if event.id().as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
                    if let TrayIconEvent::DoubleClick {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)
                .map_err(|e| format!("Failed to build tray icon: {e}"))?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            pick_folder,
            load_index,
            select_cycle,
            create_cycle,
            import_cycle,
            load_cycle_data,
            save_cycle_data,
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_start_dragging,
            window_is_always_on_top,
            window_toggle_always_on_top,
            window_get_opacity,
            window_set_opacity,
            window_is_post_it_mode,
            window_toggle_post_it_mode,
            window_is_calendar_mode,
            window_toggle_calendar_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
