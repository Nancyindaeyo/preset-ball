export interface STEventSource {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

export interface STContext {
  chatMetadata: Record<string, unknown>;
  getCurrentChatId: () => string | undefined;
  saveMetadataDebounced?: () => void;
  saveMetadata?: () => Promise<void>;
  extensionSettings?: Record<string, unknown>;
  saveSettingsDebounced?: () => void;
  eventSource: STEventSource;
  eventTypes: Record<string, string>;
  getWorldInfoNames?: () => string[];
}

declare global {
  interface Window {
    SillyTavern?: { getContext?: () => STContext };
    toastr?: {
      success: (m: string, t?: string) => void;
      warning: (m: string, t?: string) => void;
      error: (m: string, t?: string) => void;
      info: (m: string, t?: string) => void;
    };
  }
}

export function getContext(): STContext | null {
  try {
    return window.SillyTavern?.getContext?.() ?? null;
  } catch {
    return null;
  }
}

export function toast(kind: 'ok' | 'warn' | 'err' | 'info', message: string): void {
  const t = window.toastr;
  if (!t) {
    console.info(`[预设球] ${message}`);
    return;
  }
  if (kind === 'ok') t.success(message, '预设球');
  else if (kind === 'warn') t.warning(message, '预设球');
  else if (kind === 'err') t.error(message, '预设球');
  else t.info(message, '预设球');
}

export async function importHost<T = Record<string, unknown>>(path: string): Promise<T | null> {
  try {
    const mod: unknown = await import(/* @vite-ignore */ path);
    return (mod ?? null) as T;
  } catch (err) {
    console.warn('[预设球] 未能加载宿主模块', path, err);
    return null;
  }
}
