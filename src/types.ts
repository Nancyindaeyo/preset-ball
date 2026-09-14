export type RuleKind = 'group' | 'mutex' | 'pack';

export interface PackSide {
  enable: string[];
  disable: string[];
}

export interface Rule {
  id: string;
  name: string;
  kind: RuleKind;
  /** 出厂 id，用于恢复这一条 */
  builtin?: string;
  /** 快捷区 / 我的 / 细调里的分组标签 */
  section: 'quick' | 'mine' | 'fine';
  hint?: string;
  /** group / mutex 的条目名 */
  entries: string[];
  /** pack：打开时 */
  on?: PackSide;
  /** pack：关闭时 */
  off?: PackSide;
  /** 破限档位：1 起步，数字越大药越重 */
  level?: number;
  /** 仅作分组标签（伦理 / 骨架），默认不互斥，冲突用标红提示 */
  packGroup?: string;
}

export interface JailbreakTier {
  level: number;
  name: string;
  hint: string;
  entries: string[];
}

export type ProfileKind = 'patch' | 'full';

export interface Profile {
  id: string;
  name: string;
  kind: ProfileKind;
  builtin?: string;
  updatedAt: number;
  /** patch 模板：只动列出的条目 */
  enable?: string[];
  disable?: string[];
  /** full：全量快照 */
  entries?: Record<string, boolean>;
  /** 套用时是否同步下面这些全局世界书（默认关） */
  loreSync?: boolean;
  loreWorlds?: string[];
}

export interface LoreShortcut {
  id: string;
  name: string;
  worldName: string;
}

export interface Settings {
  version: number;
  orbEnabled: boolean;
  nsfwStyle: 'haitang' | 'weimei' | null;
  activeProfileId: string | null;
  profiles: Profile[];
  rules: Rule[];
  loreShortcuts: LoreShortcut[];
  /** 用户主动打开「只能选一个」的分组。默认都可以叠。 */
  exclusiveGroups: Record<string, boolean>;
}

export interface ChatBinding {
  profileId: string;
  boundAt: number;
}

export interface PromptRow {
  identifier: string;
  name: string;
  enabled: boolean;
  folder: string;
  system: boolean;
  receiver: boolean;
}

export interface Warning {
  id: string;
  text: string;
}

export interface OrbPos {
  dock: 'left' | 'right' | 'none';
  x: number;
  y: number;
}
