import { AppIndex, CycleData } from '../types/models';

const INDEX_KEY = 'cycle_planner_index_v3';
const CYCLE_FILE = 'cycle_data.json';
const HANDLE_DB = 'cycle_planner_handles';
const HANDLE_STORE = 'handles';

const emptyIndex: AppIndex = {
  cycles: [],
  selectedCycleId: undefined
};

let selectedParentHandle: FileSystemDirectoryHandle | null = null;

type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as Window & { __TAURI_INTERNALS__?: { invoke?: TauriInvoke } }).__TAURI_INTERNALS__?.invoke;
  return typeof candidate === 'function' ? candidate : null;
}

function isTauriDesktop(): boolean {
  return getTauriInvoke() !== null;
}

async function invokeDesktop<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error('Desktop runtime is not available.');
  }
  return invoke<T>(cmd, args);
}

async function invokeDesktopOr<T>(fallback: T, cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriDesktop()) return fallback;
  return invokeDesktop<T>(cmd, args);
}

function cycleKey(cycleId: string): string {
  return `cycle_planner_cycle_${cycleId}`;
}

function supportsFsApi(): boolean {
  return typeof window !== 'undefined' && !isTauriDesktop() && 'showDirectoryPicker' in window;
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sanitizeFolderName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'cycle';
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setCycleHandle(cycleId: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(handle, cycleId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getCycleHandle(cycleId: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDb();
  const result = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const req = tx.objectStore(HANDLE_STORE).get(cycleId);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

async function ensureReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const read = await handle.queryPermission({ mode: 'readwrite' });
  if (read === 'granted') return true;
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
}

async function writeCycleFile(handle: FileSystemDirectoryHandle, data: CycleData): Promise<void> {
  const fileHandle = await handle.getFileHandle(CYCLE_FILE, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readCycleFile(handle: FileSystemDirectoryHandle): Promise<CycleData> {
  const fileHandle = await handle.getFileHandle(CYCLE_FILE);
  const file = await fileHandle.getFile();
  const text = await file.text();
  return JSON.parse(text) as CycleData;
}

export async function pickFolder(): Promise<string | null> {
  if (isTauriDesktop()) {
    return invokeDesktop<string | null>('pick_folder');
  }

  if (!supportsFsApi()) {
    throw new Error('This browser does not support the folder picker API. Use a recent Chrome or Edge version.');
  }

  const handle = await window.showDirectoryPicker();
  selectedParentHandle = handle;
  return handle.name;
}

export async function loadIndex(): Promise<AppIndex> {
  if (isTauriDesktop()) {
    return invokeDesktop<AppIndex>('load_index');
  }

  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) return emptyIndex;

  try {
    return JSON.parse(raw) as AppIndex;
  } catch {
    return emptyIndex;
  }
}

export async function selectCycle(cycleId: string): Promise<AppIndex> {
  if (isTauriDesktop()) {
    return invokeDesktop<AppIndex>('select_cycle', { cycleId });
  }

  const index = await loadIndex();
  const next = { ...index, selectedCycleId: cycleId };
  localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  return next;
}

export async function createCycle(name: string, parentDir: string): Promise<AppIndex> {
  if (isTauriDesktop()) {
    return invokeDesktop<AppIndex>('create_cycle', { name, parentDir });
  }

  if (!selectedParentHandle) {
    throw new Error('Please choose a storage folder first.');
  }

  const hasPermission = await ensureReadWritePermission(selectedParentHandle);
  if (!hasPermission) {
    throw new Error('Read/write permission is required for the selected folder.');
  }

  const index = await loadIndex();
  const cycleId = uid('cycle');
  const suffix = cycleId.slice(-6);
  const folderName = `${sanitizeFolderName(name)}_${suffix}`;
  const cycleFolder = await selectedParentHandle.getDirectoryHandle(folderName, { create: true });

  const createdAt = new Date().toISOString();
  const data: CycleData = {
    id: cycleId,
    name,
    createdAt,
    goals: [],
    works: [],
    tasks: []
  };

  await writeCycleFile(cycleFolder, data);
  await setCycleHandle(cycleId, cycleFolder);

  const next: AppIndex = {
    cycles: [...index.cycles, { id: cycleId, name, createdAt, folderPath: `${selectedParentHandle.name}/${folderName}` }],
    selectedCycleId: index.selectedCycleId ?? cycleId
  };

  localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  return next;
}

export async function importCycle(folderPath: string): Promise<AppIndex> {
  if (isTauriDesktop()) {
    return invokeDesktop<AppIndex>('import_cycle', { folderPath });
  }

  if (!supportsFsApi()) {
    throw new Error('This browser does not support the folder picker API.');
  }

  const folder = await window.showDirectoryPicker();
  const hasPermission = await ensureReadWritePermission(folder);
  if (!hasPermission) {
    throw new Error('Read/write permission is required for this folder.');
  }

  const data = await readCycleFile(folder);
  const cycleId = data.id || uid('cycle');
  const cycleName = data.name || folder.name;
  const createdAt = data.createdAt || new Date().toISOString();

  const normalized: CycleData = {
    id: cycleId,
    name: cycleName,
    createdAt,
    goals: data.goals ?? [],
    works: data.works ?? [],
    tasks: data.tasks ?? []
  };

  await writeCycleFile(folder, normalized);
  await setCycleHandle(cycleId, folder);

  const index = await loadIndex();
  const existing = index.cycles.find((cycle) => cycle.id === cycleId);
  let cycles = index.cycles;

  if (existing) {
    cycles = index.cycles.map((cycle) => (
      cycle.id === cycleId
        ? { ...cycle, name: cycleName, createdAt, folderPath: folder.name }
        : cycle
    ));
  } else {
    cycles = [...index.cycles, { id: cycleId, name: cycleName, createdAt, folderPath: folder.name }];
  }

  const next: AppIndex = {
    cycles,
    selectedCycleId: cycleId
  };

  localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  return next;
}

export async function loadCycleData(cycleId: string): Promise<CycleData> {
  if (isTauriDesktop()) {
    return invokeDesktop<CycleData>('load_cycle_data', { cycleId });
  }

  const index = await loadIndex();
  const cycleMeta = index.cycles.find((cycle) => cycle.id === cycleId);

  const handle = await getCycleHandle(cycleId);
  if (handle) {
    const perm = await ensureReadWritePermission(handle);
    if (perm) {
      const data = await readCycleFile(handle);
      return {
        id: cycleId,
        name: cycleMeta?.name ?? data.name,
        createdAt: cycleMeta?.createdAt ?? data.createdAt,
        goals: data.goals ?? [],
        works: data.works ?? [],
        tasks: data.tasks ?? []
      };
    }
  }

  const raw = localStorage.getItem(cycleKey(cycleId));
  if (raw) {
    return JSON.parse(raw) as CycleData;
  }

  return {
    id: cycleId,
    name: cycleMeta?.name ?? 'Cycle',
    createdAt: cycleMeta?.createdAt ?? new Date().toISOString(),
    goals: [],
    works: [],
    tasks: []
  };
}

export async function saveCycleData(cycleId: string, data: CycleData): Promise<void> {
  if (isTauriDesktop()) {
    await invokeDesktop<void>('save_cycle_data', { cycleId, data });
    return;
  }

  const handle = await getCycleHandle(cycleId);
  if (handle) {
    const perm = await ensureReadWritePermission(handle);
    if (perm) {
      await writeCycleFile(handle, data);
      return;
    }
  }

  localStorage.setItem(cycleKey(cycleId), JSON.stringify(data));
}

export function isDesktopRuntime(): boolean {
  return isTauriDesktop();
}

export async function minimizeDesktopWindow(): Promise<void> {
  await invokeDesktopOr<void>(undefined, 'window_minimize');
}

export async function toggleMaximizeDesktopWindow(): Promise<void> {
  await invokeDesktopOr<void>(undefined, 'window_toggle_maximize');
}

export async function closeDesktopWindow(): Promise<void> {
  await invokeDesktopOr<void>(undefined, 'window_close');
}

export async function startDesktopWindowDragging(): Promise<void> {
  await invokeDesktopOr<void>(undefined, 'window_start_dragging');
}

export async function getDesktopAlwaysOnTopState(): Promise<boolean> {
  return invokeDesktopOr<boolean>(false, 'window_is_always_on_top');
}

export async function toggleDesktopAlwaysOnTop(): Promise<boolean> {
  return invokeDesktopOr<boolean>(false, 'window_toggle_always_on_top');
}

export async function getDesktopPostItModeState(): Promise<boolean> {
  return invokeDesktopOr<boolean>(false, 'window_is_post_it_mode');
}

export async function toggleDesktopPostItMode(): Promise<boolean> {
  return invokeDesktopOr<boolean>(false, 'window_toggle_post_it_mode');
}

export async function getDesktopCalendarModeState(): Promise<boolean> {
  return invokeDesktopOr<boolean>(false, 'window_is_calendar_mode');
}

export async function toggleDesktopCalendarMode(): Promise<boolean> {
  return invokeDesktopOr<boolean>(false, 'window_toggle_calendar_mode');
}

export async function getDesktopWindowOpacity(): Promise<number> {
  return invokeDesktopOr<number>(1, 'window_get_opacity');
}

export async function setDesktopWindowOpacity(opacity: number): Promise<number> {
  if (!isTauriDesktop()) return 1;
  const next = Math.min(1, Math.max(0.5, opacity));

  try {
    await invokeDesktop<void>('plugin:window|set_opacity', { label: 'main', value: next });
  } catch {
    // Keep compatibility with runtimes where core window opacity command is unavailable.
  }

  return invokeDesktop<number>('window_set_opacity', { opacity: next });
}
