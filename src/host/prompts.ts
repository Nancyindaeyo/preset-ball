import { importHost } from './context';

interface PromptDef {
  identifier?: string;
  name?: string;
}

interface OrderEntry {
  identifier: string;
  enabled?: boolean;
}

interface PromptManager {
  activeCharacter?: number | string;
  serviceSettings?: {
    prompts?: PromptDef[];
    prompt_order?: Array<{ character_id: string | number; order: OrderEntry[] }>;
    extensions?: Record<string, unknown>;
  };
  getPromptOrderEntry?: (character: unknown, identifier: string) => OrderEntry | undefined;
  getPromptOrderForCharacter?: (character: unknown) => OrderEntry[] | undefined;
  renderPromptManagerListItems?: () => Promise<void> | void;
  calculateContextTokens?: (force?: boolean) => void;
}

let pmCache: PromptManager | null = null;
let persistTimer: number | null = null;
const listeners = new Set<() => void>();

export function onPromptPersist(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function loadPm(): Promise<PromptManager | null> {
  if (pmCache?.getPromptOrderEntry) return pmCache;
  const mod = await importHost<{ promptManager?: PromptManager }>('/scripts/openai.js');
  pmCache = mod?.promptManager ?? null;
  return pmCache;
}

function activeChar(pm: PromptManager): unknown {
  return pm.activeCharacter ?? 100001;
}

export function normName(name: string): string {
  return String(name || '')
    .replace(/[\u200B-\u200D\uFEFF\uFE0F\u00A0]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function listPromptDefs(): Promise<PromptDef[]> {
  const pm = await loadPm();
  return pm?.serviceSettings?.prompts ?? [];
}

export async function getOrder(): Promise<OrderEntry[]> {
  const pm = await loadPm();
  if (!pm) return [];
  if (typeof pm.getPromptOrderForCharacter === 'function') {
    return pm.getPromptOrderForCharacter(activeChar(pm)) ?? [];
  }
  return [];
}

export interface NamedState {
  identifier: string;
  name: string;
  enabled: boolean;
}

export async function getNamedStates(): Promise<NamedState[]> {
  const [order, defs] = await Promise.all([getOrder(), listPromptDefs()]);
  const byId = new Map<string, PromptDef>();
  for (const p of defs) {
    if (p?.identifier) byId.set(p.identifier, p);
  }
  return order.map(e => {
    const def = byId.get(e.identifier);
    return {
      identifier: e.identifier,
      name: normName(def?.name || e.identifier),
      enabled: e.enabled !== false,
    };
  });
}

export function findInStates(states: NamedState[], name: string): NamedState | undefined {
  const n = normName(name);
  return states.find(s => s.name === n) ?? states.find(s => s.identifier === name);
}

async function setEnabled(identifier: string, enabled: boolean): Promise<boolean> {
  const pm = await loadPm();
  if (!pm?.getPromptOrderEntry) return false;
  const entry = pm.getPromptOrderEntry(activeChar(pm), identifier);
  if (!entry) return false;
  if ((entry.enabled !== false) === enabled) return true;
  entry.enabled = enabled;
  return true;
}

export async function applyNamedEnabled(
  changes: Array<{ name: string; enabled: boolean }>,
): Promise<{ missing: string[]; changed: number }> {
  const states = await getNamedStates();
  const missing: string[] = [];
  let changed = 0;
  for (const c of changes) {
    const hit = findInStates(states, c.name);
    if (!hit) {
      // 当前角色顺序里没有：要关等于本来就关，不报；要开才算缺
      if (c.enabled) missing.push(c.name);
      continue;
    }
    const ok = await setEnabled(hit.identifier, c.enabled);
    if (ok) {
      hit.enabled = c.enabled;
      changed += 1;
    }
  }
  schedulePersist();
  return { missing, changed };
}

export async function snapshotByName(): Promise<Record<string, boolean>> {
  const states = await getNamedStates();
  const out: Record<string, boolean> = {};
  for (const s of states) {
    const key = s.name || s.identifier;
    if (key in out) out[`${key}#${s.identifier}`] = s.enabled;
    else out[key] = s.enabled;
  }
  return out;
}

function schedulePersist(): void {
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persist();
  }, 60);
}

async function persist(): Promise<void> {
  const pm = await loadPm();
  try {
    if (pm && typeof pm.renderPromptManagerListItems === 'function') {
      await pm.renderPromptManagerListItems();
    }
  } catch {
    /* 官方列表刷新失败不阻断保存 */
  }
  try {
    pm?.calculateContextTokens?.(true);
  } catch {
    /* token 刷新失败可忽略 */
  }
  const script = await importHost<{ saveSettings?: () => void; saveSettingsDebounced?: () => void }>(
    '/script.js',
  );
  try {
    script?.saveSettingsDebounced?.() ?? script?.saveSettings?.();
  } catch {
    /* 由调用方 toast */
  }
  listeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export async function flushPromptPersist(): Promise<void> {
  if (persistTimer) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  await persist();
}
