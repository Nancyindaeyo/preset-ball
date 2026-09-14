import { FACTORY_PROFILES, FACTORY_RULES, JAILBREAK_TIERS } from '@/catalog/factory';
import { folderOf, isDivider, isReceiver, isSystemName } from '@/catalog/folders';
import { N, NSFW_STYLES } from '@/catalog/names';
import { detectWarnings, mutexRepair } from '@/catalog/warnings';
import { getContext, toast } from '@/host/context';
import { onHostEvent } from '@/host/events';
import {
  applyNamedEnabled,
  findInStates,
  flushPromptPersist,
  getNamedStates,
  snapshotByName,
  type NamedState,
} from '@/host/prompts';
import { getGlobalWorlds, listWorldNames, replaceGlobalWorlds, setGlobalWorld } from '@/host/worldinfo';
import type {
  ChatBinding,
  LoreShortcut,
  Profile,
  PromptRow,
  Rule,
  Settings,
  Warning,
} from '@/types';
import { CHAT_META_KEY, SETTINGS_KEY, uid } from '@/version';
import { reactive, ref } from 'vue';

const DEFAULT: Settings = {
  version: 1,
  orbEnabled: true,
  nsfwStyle: null,
  activeProfileId: null,
  profiles: structuredClone(FACTORY_PROFILES),
  rules: structuredClone(FACTORY_RULES),
  loreShortcuts: [],
};

export const settings = reactive<Settings>(structuredClone(DEFAULT));
export const states = ref<NamedState[]>([]);
export const warnings = ref<Warning[]>([]);
export const applying = ref(false);
export const ready = ref(false);

let writeGate = false;
let applyLock = false;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function mergeFactory(stored: Partial<Settings> | undefined): Settings {
  const base = clone(DEFAULT);
  if (!stored || typeof stored !== 'object') return base;
  if (typeof stored.orbEnabled === 'boolean') base.orbEnabled = stored.orbEnabled;
  if (stored.nsfwStyle === 'haitang' || stored.nsfwStyle === 'weimei' || stored.nsfwStyle === null) {
    base.nsfwStyle = stored.nsfwStyle;
  }
  if (typeof stored.activeProfileId === 'string' || stored.activeProfileId === null) {
    base.activeProfileId = stored.activeProfileId ?? null;
  }
  if (Array.isArray(stored.profiles) && stored.profiles.length) {
    base.profiles = stored.profiles as Profile[];
    const have = new Set(base.profiles.map(p => p.builtin).filter(Boolean));
    for (const fp of FACTORY_PROFILES) {
      if (fp.builtin && !have.has(fp.builtin)) base.profiles.push(clone(fp));
    }
  }
  const storedRules = Array.isArray(stored.rules) ? (stored.rules as Rule[]) : [];
  const byBuiltin = new Map(storedRules.filter(r => r.builtin).map(r => [r.builtin, r]));
  const userRules = storedRules.filter(r => !r.builtin);
  base.rules = [
    ...FACTORY_RULES.map(f => clone(byBuiltin.get(f.builtin) ?? f)),
    ...userRules,
  ];
  if (Array.isArray(stored.loreShortcuts)) base.loreShortcuts = stored.loreShortcuts as LoreShortcut[];
  return base;
}

function persistSettings(): void {
  if (!writeGate) return;
  const ctx = getContext();
  if (!ctx?.extensionSettings || !ctx.saveSettingsDebounced) return;
  ctx.extensionSettings[SETTINGS_KEY] = clone(settings);
  ctx.saveSettingsDebounced();
}

export function hydrateSettings(): void {
  const ctx = getContext();
  const stored = ctx?.extensionSettings?.[SETTINGS_KEY];
  const next = mergeFactory(stored && typeof stored === 'object' ? (stored as Partial<Settings>) : undefined);
  Object.assign(settings, next);
  writeGate = true;
  persistSettings();
}

export async function refreshStates(): Promise<void> {
  states.value = await getNamedStates();
  warnings.value = detectWarnings(states.value, settings.rules);
}

function onMap(): Map<string, boolean> {
  return new Map(states.value.map(s => [s.name, s.enabled]));
}

export function isOn(name: string): boolean {
  return findInStates(states.value, name)?.enabled === true;
}

export async function setNames(changes: Array<{ name: string; enabled: boolean }>): Promise<string[]> {
  if (!changes.length) return [];
  const { missing } = await applyNamedEnabled(changes);
  await refreshStates();
  if (missing.length) {
    toast('warn', `这几条在当前预设里找不到：${missing.slice(0, 4).join('、')}${missing.length > 4 ? '…' : ''}`);
  }
  return missing;
}

export async function toggleName(name: string, enabled: boolean): Promise<void> {
  const extra = mutexRepair(states.value, settings.rules, enabled ? name : undefined);
  const changes = [{ name, enabled }, ...extra.filter(c => c.name !== name)];
  await setNames(changes);
}

function flattenPack(rule: Rule, turnOn: boolean): Array<{ name: string; enabled: boolean }> {
  if (turnOn) {
    const side = rule.on;
    if (!side) return [];
    const out: Array<{ name: string; enabled: boolean }> = [];
    for (const n of side.enable) out.push({ name: n, enabled: true });
    for (const n of side.disable) out.push({ name: n, enabled: false });
    return out;
  }
  const side = rule.off;
  const empty = !side || (!side.enable.length && !side.disable.length);
  if (empty) {
    return (rule.on?.enable ?? []).map(n => ({ name: n, enabled: false }));
  }
  const out: Array<{ name: string; enabled: boolean }> = [];
  for (const n of side.enable) out.push({ name: n, enabled: true });
  for (const n of side.disable) out.push({ name: n, enabled: false });
  return out;
}

export function packIsOn(rule: Rule): boolean {
  if (rule.kind !== 'pack' || !rule.on) return false;
  if (!rule.on.enable.length) {
    return rule.on.disable.every(n => !isOn(n));
  }
  const enablesOn = rule.on.enable.every(n => isOn(n));
  const disablesOff = (rule.on.disable ?? []).every(n => !isOn(n));
  return enablesOn && disablesOff;
}

export async function applyPack(rule: Rule, turnOn: boolean): Promise<void> {
  let changes = flattenPack(rule, turnOn);
  if (rule.id === 'pack-nsfw' && turnOn) {
    if (settings.nsfwStyle === 'haitang') {
      changes.push({ name: N.nsfwHaitang, enabled: true }, { name: N.nsfwWeimei, enabled: false });
    } else if (settings.nsfwStyle === 'weimei') {
      changes.push({ name: N.nsfwWeimei, enabled: true }, { name: N.nsfwHaitang, enabled: false });
    }
  }
  if (rule.packGroup && turnOn) {
    for (const other of settings.rules) {
      if (other.packGroup === rule.packGroup && other.id !== rule.id && other.kind === 'pack') {
        changes = changes.concat(flattenPack(other, false));
      }
    }
  }
  await setNames(changes);
}

export async function applyProfile(profile: Profile, opts?: { skipLore?: boolean }): Promise<void> {
  if (applyLock) return;
  applyLock = true;
  applying.value = true;
  try {
    const changes: Array<{ name: string; enabled: boolean }> = [];
    if (profile.kind === 'full' && profile.entries) {
      for (const [name, enabled] of Object.entries(profile.entries)) {
        changes.push({ name, enabled });
      }
    } else {
      for (const n of profile.enable ?? []) changes.push({ name: n, enabled: true });
      for (const n of profile.disable ?? []) changes.push({ name: n, enabled: false });
    }
    const missing = await setNames(changes);
    settings.activeProfileId = profile.id;
    persistSettings();
    if (profile.loreSync && profile.loreWorlds?.length && !opts?.skipLore) {
      await replaceGlobalWorlds(profile.loreWorlds);
    }
    toast('ok', missing.length ? `已套用「${profile.name}」，有 ${missing.length} 条当前预设没有` : `已套用「${profile.name}」`);
  } finally {
    applying.value = false;
    applyLock = false;
  }
}

export async function saveSnapshotTo(profile: Profile): Promise<void> {
  profile.kind = 'full';
  profile.entries = await snapshotByName();
  profile.enable = undefined;
  profile.disable = undefined;
  profile.updatedAt = Date.now();
  persistSettings();
}

export function addProfileFromCurrent(name: string): Profile {
  const p: Profile = {
    id: uid('pf'),
    name: name.trim() || '未命名方案',
    kind: 'full',
    updatedAt: Date.now(),
    entries: {},
  };
  settings.profiles.push(p);
  void saveSnapshotTo(p).then(() => toast('ok', `已保存方案「${p.name}」`));
  persistSettings();
  return p;
}

export function duplicateProfile(src: Profile, name: string): Profile {
  const p: Profile = {
    ...clone(src),
    id: uid('pf'),
    name,
    builtin: undefined,
    updatedAt: Date.now(),
  };
  settings.profiles.push(p);
  persistSettings();
  return p;
}

export function removeProfile(id: string): void {
  const i = settings.profiles.findIndex(p => p.id === id);
  if (i < 0) return;
  settings.profiles.splice(i, 1);
  if (settings.activeProfileId === id) settings.activeProfileId = null;
  persistSettings();
}

export function renameProfile(id: string, name: string): void {
  const p = settings.profiles.find(x => x.id === id);
  if (!p) return;
  p.name = name.trim() || p.name;
  persistSettings();
}

export async function commitProfileDraft(
  profile: Profile,
  name: string,
  entries: Record<string, boolean>,
  applyNow: boolean,
): Promise<void> {
  profile.name = name.trim() || profile.name;
  profile.kind = 'full';
  profile.entries = clone(entries);
  profile.enable = undefined;
  profile.disable = undefined;
  profile.updatedAt = Date.now();
  persistSettings();
  if (applyNow) await applyProfile(profile);
  else toast('ok', `已保存「${profile.name}」`);
}

export function upsertRule(rule: Rule): void {
  const i = settings.rules.findIndex(r => r.id === rule.id);
  if (i >= 0) settings.rules[i] = rule;
  else settings.rules.push(rule);
  persistSettings();
}

export function removeRule(id: string): void {
  const rule = settings.rules.find(r => r.id === id);
  if (rule?.builtin) {
    toast('warn', '出厂规则不能删，可以改。不对就点恢复。');
    return;
  }
  settings.rules = settings.rules.filter(r => r.id !== id);
  persistSettings();
}

export function resetRule(id: string): void {
  const factory = FACTORY_RULES.find(r => r.id === id || r.builtin === id);
  if (!factory) return;
  const i = settings.rules.findIndex(r => r.id === id || r.builtin === factory.builtin);
  if (i >= 0) settings.rules[i] = clone(factory);
  persistSettings();
  toast('ok', '已恢复这条出厂规则');
}

export function resetAllRules(): void {
  const user = settings.rules.filter(r => !r.builtin);
  settings.rules = [...clone(FACTORY_RULES), ...user];
  persistSettings();
  toast('ok', '出厂规则已恢复（你自己建的还在）');
}

export async function setNsfwStyle(style: 'haitang' | 'weimei'): Promise<void> {
  settings.nsfwStyle = style;
  persistSettings();
  const other = style === 'haitang' ? N.nsfwWeimei : N.nsfwHaitang;
  const me = style === 'haitang' ? N.nsfwHaitang : N.nsfwWeimei;
  await setNames([
    { name: me, enabled: true },
    { name: other, enabled: false },
  ]);
}

export function jailbreakLevel(): number {
  const map = onMap();
  let level = 0;
  for (const tier of JAILBREAK_TIERS) {
    const ok = tier.entries.every(n => n === N.setKeep || map.get(n) === true);
    if (ok) level = tier.level;
    else break;
  }
  return level;
}

export async function setJailbreakLevel(level: number): Promise<void> {
  const changes: Array<{ name: string; enabled: boolean }> = [];
  for (const tier of JAILBREAK_TIERS) {
    const on = tier.level <= level;
    for (const n of tier.entries) {
      if (n === N.setKeep) {
        changes.push({ name: n, enabled: true });
        continue;
      }
      changes.push({ name: n, enabled: on });
    }
  }
  await setNames(changes);
}

export async function promptRows(): Promise<PromptRow[]> {
  const list = states.value.length ? states.value : await getNamedStates();
  return list.map(s => ({
    identifier: s.identifier,
    name: s.name,
    enabled: s.enabled,
    system: isSystemName(s.name),
    receiver: isReceiver(s.name),
    folder: folderOf(s.name, isSystemName(s.name) || isDivider(s.name)),
  }));
}

export function readBinding(): ChatBinding | null {
  const ctx = getContext();
  const raw = ctx?.chatMetadata?.[CHAT_META_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as ChatBinding;
  if (!obj.profileId) return null;
  return obj;
}

export function writeBinding(binding: ChatBinding | null): void {
  const ctx = getContext();
  if (!ctx?.chatMetadata) return;
  if (binding) ctx.chatMetadata[CHAT_META_KEY] = binding;
  else delete ctx.chatMetadata[CHAT_META_KEY];
  ctx.saveMetadataDebounced?.() ?? void ctx.saveMetadata?.();
}

export function bindCurrentChat(profileId: string): void {
  writeBinding({ profileId, boundAt: Date.now() });
  toast('ok', '已绑定到这个聊天。下次打开会自动套用。');
}

export function unbindCurrentChat(): void {
  writeBinding(null);
  toast('ok', '已解除绑定');
}

export async function applyBoundIfAny(): Promise<void> {
  const bind = readBinding();
  if (!bind) return;
  const profile = settings.profiles.find(p => p.id === bind.profileId);
  if (!profile) {
    writeBinding(null);
    toast('warn', '绑定的方案已经不在了，已解开。');
    return;
  }
  await applyProfile(profile);
}

export async function addLoreShortcut(worldName: string, alias?: string): Promise<void> {
  if (settings.loreShortcuts.some(s => s.worldName === worldName)) {
    toast('info', '这本已经在快捷里了');
    return;
  }
  settings.loreShortcuts.push({
    id: uid('lore'),
    name: alias?.trim() || worldName,
    worldName,
  });
  persistSettings();
}

export function removeLoreShortcut(id: string): void {
  settings.loreShortcuts = settings.loreShortcuts.filter(s => s.id !== id);
  persistSettings();
}

export async function toggleLore(shortcut: LoreShortcut): Promise<void> {
  const globals = await getGlobalWorlds();
  const on = globals.includes(shortcut.worldName);
  const ok = await setGlobalWorld(shortcut.worldName, !on);
  if (!ok) toast('err', '挂载失败，可能当前环境读不到世界书列表');
}

export { getGlobalWorlds, listWorldNames, persistSettings, JAILBREAK_TIERS };

let lastChat = '';

export function bindHostEvents(): void {
  onHostEvent('CHAT_CHANGED', () => {
    const id = getContext()?.getCurrentChatId?.() ?? '';
    if (id === lastChat) return;
    lastChat = id;
    void applyBoundIfAny();
  });
  onHostEvent('OAI_PRESET_CHANGED_AFTER', () => {
    window.setTimeout(() => void refreshStates(), 280);
  });
  onHostEvent('CHAT_LOADED', () => {
    window.setTimeout(() => void refreshStates(), 120);
  });
}

export async function bootStore(): Promise<void> {
  hydrateSettings();
  lastChat = getContext()?.getCurrentChatId?.() ?? '';
  await refreshStates();
  bindHostEvents();
  await applyBoundIfAny();
  ready.value = true;
}

export { flushPromptPersist };
