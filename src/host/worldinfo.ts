import { getContext, importHost } from './context';

interface WorldMod {
  selected_world_info?: string[];
  world_names?: string[];
  world_info?: { globalSelect?: string[] };
  updateWorldInfoList?: () => Promise<void> | void;
}

async function loadWi(): Promise<WorldMod | null> {
  return importHost<WorldMod>('/scripts/world-info.js');
}

export async function listWorldNames(): Promise<string[]> {
  const wi = await loadWi();
  if (Array.isArray(wi?.world_names) && wi.world_names.length) return [...wi.world_names];
  const ctx = getContext();
  try {
    const names = ctx?.getWorldInfoNames?.();
    if (Array.isArray(names)) return names;
  } catch {
    /* ignore */
  }
  return [];
}

export async function getGlobalWorlds(): Promise<string[]> {
  const wi = await loadWi();
  if (Array.isArray(wi?.selected_world_info)) return [...wi.selected_world_info];
  if (Array.isArray(wi?.world_info?.globalSelect)) return [...wi.world_info.globalSelect];
  return [];
}

function syncSelectBox(selected: string[], names: string[]): void {
  const el = document.querySelector<HTMLSelectElement>('#world_info');
  if (!el) return;
  for (const opt of Array.from(el.options)) {
    const name = names[Number(opt.value)] ?? opt.textContent ?? '';
    opt.selected = selected.includes(name);
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function setGlobalWorld(worldName: string, attached: boolean): Promise<boolean> {
  const wi = await loadWi();
  if (!wi?.selected_world_info) return false;
  const list = wi.selected_world_info;
  const idx = list.indexOf(worldName);
  if (attached && idx < 0) list.push(worldName);
  if (!attached && idx >= 0) list.splice(idx, 1);
  if (wi.world_info) wi.world_info.globalSelect = list;
  try {
    await wi.updateWorldInfoList?.();
  } catch {
    /* UI 刷新失败仍继续存 */
  }
  syncSelectBox(list, wi.world_names ?? []);
  const script = await importHost<{ saveSettingsDebounced?: () => void; saveSettings?: () => void }>(
    '/script.js',
  );
  script?.saveSettingsDebounced?.() ?? script?.saveSettings?.();
  const ctx = getContext();
  ctx?.saveSettingsDebounced?.();
  return true;
}

export async function replaceGlobalWorlds(worldNames: string[]): Promise<void> {
  const wi = await loadWi();
  if (!wi?.selected_world_info) return;
  wi.selected_world_info.splice(0, wi.selected_world_info.length, ...worldNames);
  if (wi.world_info) wi.world_info.globalSelect = wi.selected_world_info;
  try {
    await wi.updateWorldInfoList?.();
  } catch {
    /* ignore */
  }
  syncSelectBox(wi.selected_world_info, wi.world_names ?? []);
  const script = await importHost<{ saveSettingsDebounced?: () => void; saveSettings?: () => void }>(
    '/script.js',
  );
  script?.saveSettingsDebounced?.() ?? script?.saveSettings?.();
}
