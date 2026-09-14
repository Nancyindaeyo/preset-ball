export type RuleKind = 'group' | 'mutex' | 'pack' | 'ladder';

export interface PackSide {
  enable: string[];
  disable: string[];
}

export interface LadderTier {
  name: string;
  entries: string[];
}

export interface Rule {
  id: string;
  name: string;
  kind: RuleKind;
  /** 出厂 id，用于恢复这一条 */
  builtin?: string;
  /** 快捷区 / 我的 / 细调里的分组标签 */
  section: 'quick' | 'mine' | 'fine';
  /** 界面上的备注，比如「一次加一层」 */
  hint?: string;
  /** group / mutex 的条目名 */
  entries: string[];
  /** pack：打开时 */
  on?: PackSide;
  /** pack：关闭时 */
  off?: PackSide;
  /** 档位：从低到高，选更高档会带上更低档 */
  tiers?: LadderTier[];
  /** 仅作分组标签，默认不互斥，冲突用标红提示 */
  packGroup?: string;
  /** 绑在哪个预设的快捷上。出厂蛾摩拉规则没有这个字段，只在蛾摩拉显示 */
  presetKey?: string;
}

export type ProfileKind = 'patch' | 'full';

export interface Profile {
  id: string;
  name: string;
  kind: ProfileKind;
  builtin?: string;
  updatedAt: number;
  enable?: string[];
  disable?: string[];
  entries?: Record<string, boolean>;
  /** 套用时按这份列表开关快捷世界书。空数组 = 快捷书全摘掉 */
  loreWorlds?: string[];
}

export interface LoreShortcut {
  id: string;
  name: string;
  worldName: string;
}

export interface FineFolder {
  id: string;
  name: string;
  entries: string[];
}

export interface Settings {
  version: number;
  orbEnabled: boolean;
  nsfwStyle: 'haitang' | 'weimei' | null;
  activeProfileId: string | null;
  profiles: Profile[];
  rules: Rule[];
  loreShortcuts: LoreShortcut[];
  exclusiveGroups: Record<string, boolean>;
  /** 用户删掉的出厂规则，hydrate 时不要补回来 */
  removedBuiltins: string[];
  /** 非蛾摩拉预设：按预设名记住自己分的组 */
  fineLayouts: Record<string, FineFolder[]>;
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
