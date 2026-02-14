type FileSystemPermissionMode = 'read' | 'readwrite';
type FileSystemPermissionState = 'granted' | 'denied' | 'prompt';

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: FileSystemPermissionMode;
  }

  interface FileSystemHandle {
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<FileSystemPermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<FileSystemPermissionState>;
  }

  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };

    showDirectoryPicker(options?: {
      id?: string;
      mode?: FileSystemPermissionMode;
      startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;
  }
}

export {};
