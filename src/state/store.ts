import { FACTORY_PROFILES, FACTORY_RULES, OBSOLETE_BUILTINS } from '@/catalog/factory';
import { folderOf, isDivider, isMothraPreset, isReceiver, isSystemName } from '@/catalog/folders';
import { N } from '@/catalog/names';
import { detectWarnings, overlapWarningId, packVisiblyOn } from '@/catalog/warnings';
import { getContext, toast } from '@/host/context';
import { onHostEvent } from '@/host/events';
import {
  applyNamedEnabled,
  commitHostWrites,
  findInStates,
  getNamedStates,
  getPresetLabel,
  type NamedState,
} from '@/host/prompts';
import { getGlobalWorlds, listWorldNames, setGlobalWorld } from '@/host/worldinfo';
import type {
  ChatBinding,
  FineFolder,
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
  version: 2,
  orbEnabled: true,
  nsfwStyle: null,
  activeProfileId: null,
  profiles: structuredClone(FACTORY_PROFILES),
  rules: structuredClone(FACTORY_RULES),
  loreShortcuts: [],
  exclusiveGroups: {},
  removedBuiltins: [],
  fineLayouts: {},
};

export const settings = reactive<Settings>(structuredClone(DEFAULT));
export const states = ref<NamedState[]>([]);
export const warnings = ref<Warning[]>([]);
export const applying = ref(false);
export const ready = ref(false);
export const dirty = ref(false);
export const schemeDirty = ref(false);
export const mothra = ref(true);
export const presetKey = ref('');

let writeGate = false;
let applyLock = false;
const baseline = new Map<string, boolean>();

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
  if (Array.isArray(stored.profiles)) {
    base.profiles = stored.profiles as Profile[];
  }
  const obsolete = new Set(OBSOLETE_BUILTINS);
  const removed = new Set<string>([
    ...(Array.isArray(stored.removedBuiltins) ? stored.removedBuiltins : []),
    ...OBSOLETE_BUILTINS,
  ]);
  const storedRules = Array.isArray(stored.rules) ? (stored.rules as Rule[]) : [];
  const kept = storedRules.filter(r => !r.builtin || !obsolete.has(r.builtin));
  const have = new Set(kept.map(r => r.builtin).filter((id): id is string => Boolean(id)));
  const added = FACTORY_RULES.filter(f => f.builtin && !have.has(f.builtin) && !removed.has(f.builtin)).map(clone);
  base.rules = [...kept, ...added];
  base.removedBuiltins = [...removed].filter(id => !obsolete.has(id));
  if (Array.isArray(stored.loreShortcuts)) base.loreShortcuts = stored.loreShortcuts as LoreShortcut[];
  if (stored.exclusiveGroups && typeof stored.exclusiveGroups === 'object') {
    base.exclusiveGroups = { ...(stored.exclusiveGroups as Record<string, boolean>) };
  }
  if (stored.fineLayouts && typeof stored.fineLayouts === 'object') {
    base.fineLayouts = stored.fineLayouts as Record<string, FineFolder[]>;
  }
  base.version = 2;
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
  if (!stored) persistSettings();
}

function rememberBaseline(): void {
  baseline.clear();
  for (const s of states.value) baseline.set(s.identifier, s.enabled);
  dirty.value = false;
}

function markDirty(): void {
  dirty.value = states.value.some(s => baseline.get(s.identifier) !== s.enabled);
  schemeDirty.value = true;
}

function snapshotLocal(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of states.value) {
    const key = s.name || s.identifier;
    if (key in out) out[`${key}#${s.identifier}`] = s.enabled;
    else out[key] = s.enabled;
  }
  return out;
}

export function refreshWarnings(): void {
  warnings.value = detectWarnings(states.value, settings.rules);
}

export async function pullFromHost(): Promise<void> {
  states.value = await getNamedStates();
  presetKey.value = await getPresetLabel(states.value);
  mothra.value = isMothraPreset(states.value);
  bindUntaggedRulesToPreset();
  refreshWarnings();
  rememberBaseline();
  schemeDirty.value = false;
}

function bindUntaggedRulesToPreset(): void {
  if (!presetKey.value) return;
  let changed = false;
  for (const r of settings.rules) {
    if (r.builtin || r.presetKey) continue;
    r.presetKey = presetKey.value;
    changed = true;
  }
  if (changed) persistSettings();
}

/** 出厂蛾摩拉规则只在蛾摩拉显示；自己建的组跟当前预设走 */
export function ruleForCurrentPreset(rule: Rule): boolean {
  if (rule.presetKey) return rule.presetKey === presetKey.value;
  if (rule.builtin) return mothra.value;
  return true;
}

export function homeShortcutRules(): Rule[] {
  return settings.rules.filter(r => r.section !== 'fine' && ruleForCurrentPreset(r));
}

export async function refreshStates(): Promise<void> {
  await pullFromHost();
}

function lastWins(changes: Array<{ name: string; enabled: boolean }>): Array<{ name: string; enabled: boolean }> {
  const map = new Map<string, boolean>();
  for (const c of changes) map.set(c.name, c.enabled);
  return [...map.entries()].map(([name, enabled]) => ({ name, enabled }));
}

function onMap(): Map<string, boolean> {
  return new Map(states.value.map(s => [s.name, s.enabled]));
}

export function isOn(name: string): boolean {
  return findInStates(states.value, name)?.enabled === true;
}

export async function setNames(changes: Array<{ name: string; enabled: boolean }>): Promise<string[]> {
  if (!changes.length) return [];
  if (!states.value.length) await pullFromHost();
  const missing: string[] = [];
  const next = states.value.map(s => ({ ...s }));
  for (const c of lastWins(changes)) {
    const hit = findInStates(next, c.name);
    if (!hit) {
      if (c.enabled) missing.push(c.name);
      continue;
    }
    hit.enabled = c.enabled;
  }
  states.value = next;
  refreshWarnings();
  markDirty();
  if (missing.length) {
    toast('warn', `这几条在当前预设里找不到：${missing.slice(0, 4).join('、')}${missing.length > 4 ? '…' : ''}`);
  }
  return missing;
}

function hostDiffs(): Array<{ name: string; enabled: boolean }> {
  const out: Array<{ name: string; enabled: boolean }> = [];
  for (const s of states.value) {
    if (baseline.get(s.identifier) !== s.enabled) out.push({ name: s.name, enabled: s.enabled });
  }
  return out;
}

export async function pushToHost(): Promise<string[]> {
  if (!states.value.length) await pullFromHost();
  const diffs = hostDiffs();
  if (!diffs.length) {
    dirty.value = false;
    return [];
  }
  const { missing } = await applyNamedEnabled(diffs);
  await commitHostWrites();
  rememberBaseline();
  if (missing.length) {
    toast('warn', `这几条在当前预设里找不到：${missing.slice(0, 4).join('、')}${missing.length > 4 ? '…' : ''}`);
  }
  return missing;
}

export async function toggleName(name: string, enabled: boolean): Promise<void> {
  await setNames([{ name, enabled }]);
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
  return packVisiblyOn(rule, isOn, settings.rules);
}

/** 同组里真的有开/关打架时才标红，子集包同时亮不算 */
export function packClash(rule: Rule): boolean {
  const id = overlapWarningId(rule.id, settings.rules);
  return Boolean(id && packIsOn(rule) && warnings.value.some(w => w.id === id));
}

function groupIsExclusive(rule: Rule): boolean {
  const key = rule.packGroup;
  if (!key) return false;
  return settings.exclusiveGroups?.[key] === true;
}

export async function applyPack(rule: Rule, turnOn: boolean): Promise<void> {
  let changes: Array<{ name: string; enabled: boolean }> = [];
  if (turnOn && groupIsExclusive(rule) && rule.packGroup) {
    const keep = new Set(rule.on?.enable ?? []);
    for (const other of settings.rules) {
      if (other.packGroup !== rule.packGroup || other.id === rule.id || other.kind !== 'pack') continue;
      for (const n of other.on?.enable ?? []) {
        if (!keep.has(n)) changes.push({ name: n, enabled: false });
      }
    }
  }
  changes = changes.concat(flattenPack(rule, turnOn));
  if (rule.id === 'pack-nsfw' && turnOn) {
    if (settings.nsfwStyle === 'haitang') {
      changes.push({ name: N.nsfwHaitang, enabled: true }, { name: N.nsfwWeimei, enabled: false });
    } else if (settings.nsfwStyle === 'weimei') {
      changes.push({ name: N.nsfwWeimei, enabled: true }, { name: N.nsfwHaitang, enabled: false });
    }
  }
  await setNames(lastWins(changes));
}

export function loadProfileToDraft(profile: Profile): string[] {
  const next = states.value.map(s => ({ ...s }));
  const missing: string[] = [];
  if (profile.kind === 'full' && profile.entries) {
    for (const [name, enabled] of Object.entries(profile.entries)) {
      const hit = findInStates(next, name);
      if (!hit) {
        if (enabled) missing.push(name);
        continue;
      }
      hit.enabled = enabled;
    }
  } else {
    for (const n of profile.enable ?? []) {
      const hit = findInStates(next, n);
      if (hit) hit.enabled = true;
      else missing.push(n);
    }
    for (const n of profile.disable ?? []) {
      const hit = findInStates(next, n);
      if (hit) hit.enabled = false;
    }
  }
  states.value = next;
  refreshWarnings();
  settings.activeProfileId = profile.id;
  persistSettings();
  markDirty();
  return missing;
}

export function currentProfile(): Profile | null {
  return settings.profiles.find(p => p.id === settings.activeProfileId) ?? null;
}

export async function applyProfile(profile: Profile, opts?: { skipLore?: boolean }): Promise<void> {
  if (applyLock) return;
  applyLock = true;
  applying.value = true;
  try {
    if (!states.value.length) await pullFromHost();
    const missing = loadProfileToDraft(profile);
    await pushToHost();
    if (!opts?.skipLore) await applyShortcutLore(profile.loreWorlds ?? []);
    schemeDirty.value = false;
    toast('ok', missing.length ? `已套用「${profile.name}」，有 ${missing.length} 条当前预设没有` : `已套用「${profile.name}」`);
  } catch (err) {
    console.error('[预设球] 套用方案失败', err);
    toast('err', '套用失败，看看控制台');
  } finally {
    applying.value = false;
    applyLock = false;
  }
}

export async function snapshotShortcutLore(): Promise<string[]> {
  const globals = await getGlobalWorlds();
  return settings.loreShortcuts.map(s => s.worldName).filter(w => globals.includes(w));
}

export async function applyShortcutLore(worlds: string[]): Promise<void> {
  const wanted = new Set(worlds);
  const globals = await getGlobalWorlds();
  for (const s of settings.loreShortcuts) {
    const should = wanted.has(s.worldName);
    const is = globals.includes(s.worldName);
    if (should !== is) await setGlobalWorld(s.worldName, should);
  }
}

export async function saveSnapshotTo(profile: Profile): Promise<void> {
  profile.kind = 'full';
  profile.entries = snapshotLocal();
  profile.enable = undefined;
  profile.disable = undefined;
  profile.loreWorlds = await snapshotShortcutLore();
  profile.updatedAt = Date.now();
  persistSettings();
}

export function addProfileFromCurrent(name: string): Profile {
  const p: Profile = {
    id: uid('pf'),
    name: name.trim() || '未命名方案',
    kind: 'full',
    updatedAt: Date.now(),
    entries: snapshotLocal(),
    loreWorlds: [],
  };
  settings.profiles.push(p);
  settings.activeProfileId = p.id;
  persistSettings();
  void snapshotShortcutLore().then(worlds => {
    p.loreWorlds = worlds;
    persistSettings();
  });
  schemeDirty.value = false;
  toast('ok', `已保存方案「${p.name}」`);
  return p;
}

export async function saveCurrentProfile(): Promise<void> {
  const missing = await pushToHost();
  let p = currentProfile();
  if (!p) {
    const name = window.prompt('还没有当前方案。给现在这份起个名', '未命名方案');
    if (name == null) return;
    p = addProfileFromCurrent(name);
  }
  await saveSnapshotTo(p);
  schemeDirty.value = false;
  const who = `「${p.name}」`;
  toast('ok', missing.length ? `已保存${who}，有 ${missing.length} 条当前预设没有` : `已保存${who}`);
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
  const bind = readBinding();
  if (bind?.profileId === id) writeBinding(null);
  persistSettings();
}

export function restoreFactoryProfiles(): void {
  const have = new Set(settings.profiles.map(p => p.builtin).filter(Boolean));
  let added = 0;
  for (const fp of FACTORY_PROFILES) {
    if (fp.builtin && !have.has(fp.builtin)) {
      settings.profiles.unshift(clone(fp));
      added += 1;
    }
  }
  persistSettings();
  toast(added ? 'ok' : 'info', added ? `已补回 ${added} 个出厂方案` : '出厂方案都在，不用补');
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
  schemeDirty.value = false;
  if (applyNow) await applyProfile(profile);
  else toast('ok', `已保存「${profile.name}」`);
}

export function upsertRule(rule: Rule): void {
  if (!rule.builtin) rule.presetKey = rule.presetKey || presetKey.value || undefined;
  const i = settings.rules.findIndex(r => r.id === rule.id);
  if (i >= 0) settings.rules[i] = rule;
  else settings.rules.push(rule);
  persistSettings();
  refreshWarnings();
}

export function removeRule(id: string): void {
  const rule = settings.rules.find(r => r.id === id);
  if (!rule) return;
  if (rule.builtin && !settings.removedBuiltins.includes(rule.builtin)) {
    settings.removedBuiltins.push(rule.builtin);
  }
  settings.rules = settings.rules.filter(r => r.id !== id);
  persistSettings();
  refreshWarnings();
}

export function resetRule(id: string): void {
  const factory = FACTORY_RULES.find(r => r.id === id || r.builtin === id);
  if (!factory) return;
  const i = settings.rules.findIndex(r => r.id === id || r.builtin === factory.builtin);
  if (i >= 0) settings.rules[i] = clone(factory);
  persistSettings();
  refreshWarnings();
  toast('ok', '已恢复这条出厂规则');
}

export function resetAllRules(): void {
  const user = settings.rules.filter(r => !r.builtin);
  settings.rules = [...clone(FACTORY_RULES), ...user];
  settings.removedBuiltins = [];
  persistSettings();
  refreshWarnings();
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

export function ladderLevel(rule: Rule): number {
  if (rule.kind !== 'ladder' || !rule.tiers?.length) return 0;
  const map = onMap();
  let level = 0;
  for (let i = 0; i < rule.tiers.length; i++) {
    const ok = rule.tiers[i].entries.every(n => n === N.setKeep || map.get(n) === true);
    if (ok) level = i + 1;
    else break;
  }
  return level;
}

export async function setLadderLevel(rule: Rule, level: number): Promise<void> {
  if (rule.kind !== 'ladder' || !rule.tiers) return;
  const changes: Array<{ name: string; enabled: boolean }> = [];
  for (let i = 0; i < rule.tiers.length; i++) {
    const on = i < level;
    for (const n of rule.tiers[i].entries) {
      if (n === N.setKeep) {
        changes.push({ name: n, enabled: true });
        continue;
      }
      changes.push({ name: n, enabled: on });
    }
  }
  await setNames(changes);
}

export function currentFineLayout(): FineFolder[] | undefined {
  if (mothra.value) return undefined;
  const layout = settings.fineLayouts[presetKey.value];
  return layout?.length ? layout : undefined;
}

export function saveFineLayout(folders: FineFolder[]): void {
  if (!presetKey.value) return;
  settings.fineLayouts[presetKey.value] = clone(folders);
  persistSettings();
}

export function hasFineLayout(): boolean {
  return Boolean(settings.fineLayouts[presetKey.value]?.length);
}

export async function promptRows(): Promise<PromptRow[]> {
  const list = states.value.length ? states.value : await getNamedStates();
  const layout = currentFineLayout();
  return list.map(s => ({
    identifier: s.identifier,
    name: s.name,
    enabled: s.enabled,
    system: isSystemName(s.name),
    receiver: isReceiver(s.name),
    folder: folderOf(s.name, isSystemName(s.name) || isDivider(s.name), layout),
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
  else schemeDirty.value = true;
}

export async function toggleMutex(rule: Rule, name: string): Promise<void> {
  const turnOn = !isOn(name);
  const changes: Array<{ name: string; enabled: boolean }> = [];
  if (turnOn) {
    for (const n of rule.entries) changes.push({ name: n, enabled: n === name });
  } else {
    changes.push({ name, enabled: false });
  }
  await setNames(changes);
}

export function addRuleEntry(rule: Rule, name: string): void {
  if (rule.kind === 'pack') {
    if (!rule.on) rule.on = { enable: [], disable: [] };
    if (!rule.on.enable.includes(name)) rule.on.enable.push(name);
  } else if (rule.kind === 'ladder') {
    if (!rule.tiers?.length) return;
    const last = rule.tiers[rule.tiers.length - 1];
    if (!last.entries.includes(name)) last.entries.push(name);
  } else if (!rule.entries.includes(name)) {
    rule.entries.push(name);
  }
  persistSettings();
  refreshWarnings();
}

export function removeRuleEntry(rule: Rule, name: string): void {
  if (rule.kind === 'pack' && rule.on) {
    rule.on.enable = rule.on.enable.filter(n => n !== name);
    rule.on.disable = rule.on.disable.filter(n => n !== name);
    if (rule.off) {
      rule.off.enable = rule.off.enable.filter(n => n !== name);
      rule.off.disable = rule.off.disable.filter(n => n !== name);
    }
  } else if (rule.kind === 'ladder' && rule.tiers) {
    for (const t of rule.tiers) t.entries = t.entries.filter(n => n !== name);
  } else {
    rule.entries = rule.entries.filter(n => n !== name);
  }
  persistSettings();
  refreshWarnings();
}

export { getGlobalWorlds, listWorldNames, persistSettings };

let lastChat = '';
let stopHostEvents: (() => void) | undefined;
let boundApplyTimer = 0;

export function unbindHostEvents(): void {
  stopHostEvents?.();
  stopHostEvents = undefined;
  if (boundApplyTimer) {
    window.clearTimeout(boundApplyTimer);
    boundApplyTimer = 0;
  }
}

export function bindHostEvents(): void {
  unbindHostEvents();
  stopHostEvents = onHostEvent('CHAT_CHANGED', () => {
    const id = getContext()?.getCurrentChatId?.() ?? '';
    if (id === lastChat) return;
    lastChat = id;
    void applyBoundIfAny();
  });
}

function scheduleBoundApply(): void {
  if (boundApplyTimer) window.clearTimeout(boundApplyTimer);
  boundApplyTimer = window.setTimeout(() => {
    boundApplyTimer = 0;
    void applyBoundIfAny();
  }, 0);
}

export async function bootStore(): Promise<void> {
  hydrateSettings();
  lastChat = getContext()?.getCurrentChatId?.() ?? '';
  bindHostEvents();
  scheduleBoundApply();
  ready.value = true;
}
