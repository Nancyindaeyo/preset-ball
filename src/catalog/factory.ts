import type { LadderTier, Profile, Rule } from '@/types';
import {
  ALWAYS_OFF,
  ASSISTANT_BOTTOMS,
  BODY_LEN,
  FAN_RELATED,
  GRABS,
  N,
  NOVEL_TYPES,
  NSFW_PATCHES,
  NSFW_STYLES,
  PERSONS,
  PSY,
  RECEIVERS,
  SMALL_COT,
  STYLES,
  TONES,
} from './names';

function pack(
  id: string,
  name: string,
  extra: Partial<Rule> & { on: { enable: string[]; disable: string[] }; off?: { enable: string[]; disable: string[] } },
): Rule {
  return {
    id,
    name,
    kind: 'pack',
    builtin: id,
    section: extra.section ?? 'quick',
    hint: extra.hint,
    entries: [],
    on: extra.on,
    off: extra.off ?? { enable: [], disable: extra.on.enable },
    packGroup: extra.packGroup,
  };
}

function mutex(id: string, name: string, entries: string[], hint?: string, section: Rule['section'] = 'fine'): Rule {
  return { id, name, kind: 'mutex', builtin: id, section, hint, entries };
}

function group(id: string, name: string, entries: string[], hint?: string, section: Rule['section'] = 'fine'): Rule {
  return { id, name, kind: 'group', builtin: id, section, hint, entries };
}

export const JAILBREAK_TIERS: LadderTier[] = [
  {
    name: '日常',
    entries: [N.setKeep, N.gemini429, N.identity3, N.noPrefillBottom],
  },
  {
    name: '非流拒写',
    entries: [N.geminiHead],
  },
  {
    name: '流式中断',
    entries: [N.bottomBreak1],
  },
  {
    name: '仍截断',
    entries: [N.streamCut2],
  },
];

const RECV_PACKS: Rule[] = [
  pack('pack-recv-base', '一键基础需求', {
    hint: '不开这个接收器，基础需求分区进不去。',
    on: { enable: [N.recvBase], disable: [] },
  }),
  pack('pack-recv-opt', '一键优化', {
    hint: '不开这个接收器，优化分区进不去。',
    on: { enable: [N.recvOpt], disable: [] },
  }),
  pack('pack-nsfw', '一键 NSFW', {
    hint: '开思考和接收器。文笔用你上次选的。关闸出厂会开回防止发情，可在抽屉里改。',
    on: {
      enable: [N.nsfwThink, N.nsfwRecv],
      disable: [N.noHorny, N.nsfwFlow, N.nsfwOpt1, N.nsfwOpt2],
    },
    off: {
      enable: [N.noHorny],
      disable: [N.nsfwThink, N.nsfwWeimei, N.nsfwHaitang, N.nsfwFlow, N.nsfwOpt1, N.nsfwOpt2, N.nsfwRecv],
    },
  }),
  pack('pack-recv-scan', '一键情感扫描', {
    hint: '不开这个接收器，扫描规则进不去。',
    on: { enable: [N.scanRecv], disable: [] },
  }),
  pack('pack-recv-silent', '一键缄默法则', {
    hint: '默认常常关着。点开才把缄默分区送进上下文。',
    on: { enable: [N.recvSilent], disable: [] },
  }),
  pack('pack-recv-fmt', '一键功能分区', {
    hint: '格式栏 / 功能分区的接收器。',
    on: { enable: [N.recvFmt], disable: [] },
  }),
  pack('pack-recv-author', '一键蛾摩拉说', {
    hint: '蛾摩拉说分区的接收器。可在抽屉里加自己的条目。',
    on: { enable: [N.recvAuthor], disable: [] },
  }),
];

export const FACTORY_RULES: Rule[] = [
  mutex('mutex-skeleton', '思维链（只能开一条）', [
    N.skeletonFixed,
    N.skeletonFanFull,
    N.skeletonFanShort,
    N.skeletonChar,
    N.skeletonFree,
    N.skeleton36,
  ], '开两条等于抢作业，模型会写两遍作文。', 'fine'),
  mutex('mutex-type', '小说类型', NOVEL_TYPES, '多人后宫用 <user>中心，不要开群像。'),
  mutex('mutex-person', '人称', PERSONS),
  mutex('mutex-grab', '怎么处理你的输入', GRABS),
  mutex('mutex-tone', '小说基调', TONES, '同人用泡泡宇宙；原创不要留着同人基调。'),
  mutex('mutex-style', '文风', STYLES, '只开一个。'),
  mutex('mutex-psy', '心理活动颜色', PSY),
  mutex('mutex-nsfw-style', 'NSFW 文笔', NSFW_STYLES, '海棠和唯美同变量，只能留一个。', 'fine'),
  mutex('mutex-nsfw-patch', 'NSFW 性向补丁', NSFW_PATCHES),
  mutex('mutex-small-cot', '正文小 CoT', SMALL_COT, '和长思维链同开会写两遍。Gemini 默认全关。'),
  mutex('mutex-body-len', '正文长短', BODY_LEN),
  group('group-alive', '人设立体（可选）', [N.alive, N.independent, N.antiBot, N.antiOmni, N.feeling, N.dim], undefined, 'fine'),

  ...RECV_PACKS,

  {
    id: 'ladder-jailbreak',
    name: '破限档位',
    kind: 'ladder',
    builtin: 'ladder-jailbreak',
    section: 'quick',
    hint: '一次加一层。数字越大药越重，智力越容易掉。',
    entries: [],
    tiers: structuredClone(JAILBREAK_TIERS),
  },

  pack('jb-check', '关掉底部 assistant', {
    hint: 'Gemini 3.5 请求末尾不能是模型条，否则 400。',
    on: { enable: [], disable: ASSISTANT_BOTTOMS },
  }),
];

/** 旧主页板块，hydrate 时丢掉，不再补回 */
export const OBSOLETE_BUILTINS = [
  'pack-original',
  'pack-fanfic',
  'pack-charcard',
  'pack-light',
  'ethics-healthy',
  'ethics-slow',
  'ethics-haitang',
  'ethics-dark',
  'group-persona',
];

export const FACTORY_PROFILES: Profile[] = [
  {
    id: 'pf-original',
    name: '原创',
    kind: 'patch',
    builtin: 'pf-original',
    updatedAt: 0,
    loreWorlds: [],
    enable: [N.skeletonFixed, N.cal, N.ooc, N.stereo],
    disable: [...FAN_RELATED, N.skeletonChar, N.skeletonFree, N.skeleton36, N.friendly, N.perfect, N.sweetBrain, ...ALWAYS_OFF],
  },
  {
    id: 'pf-fanfic',
    name: '同人',
    kind: 'patch',
    builtin: 'pf-fanfic',
    updatedAt: 0,
    loreWorlds: [],
    enable: [N.skeletonFanFull, N.fanOpt, N.toneFan, N.cal, N.ooc, N.stereo],
    disable: [
      N.skeletonFixed,
      N.skeletonFanShort,
      N.skeletonChar,
      N.skeletonFree,
      N.skeleton36,
      N.toneDaily,
      N.toneDrama,
      N.toneLove,
      N.tonePull,
      N.toneCruel,
      N.friendly,
      N.perfect,
      N.sweetBrain,
      ...ALWAYS_OFF,
    ],
  },
  {
    id: 'pf-charcard',
    name: '角色卡',
    kind: 'patch',
    builtin: 'pf-charcard',
    updatedAt: 0,
    loreWorlds: [],
    enable: [N.skeletonFixed, N.cal, N.ooc, N.stereo],
    disable: [...FAN_RELATED, ...ALWAYS_OFF],
  },
];

export const FOLDER_HINTS: Array<{ folder: string; match: (name: string) => boolean }> = [
  { folder: '破限头尾', match: n => /Gemini|身份定义|底部破限|抗流式|抗非流|预填|无预填|G无思维|克think|防标记|蛾摩拉回复|set-不要关|是Gemini/.test(n) },
  { folder: '小说类型', match: n => NOVEL_TYPES.includes(n) || n.includes('小说类型') },
  { folder: '思维链', match: n => n.startsWith('→') || n.startsWith('←') || n.startsWith('💭') || n.includes('思维链') || n.includes('小CoT') },
  { folder: '人设', match: n => ([N.cal, N.ooc, N.stereo, N.alive, N.independent, N.antiBot, N.antiOmni, N.feeling, N.dim] as string[]).includes(n) },
  { folder: '伦理 / 情感', match: n => n.startsWith('❃') || n.includes('情感扫描') || n.includes('抗支配') || n.includes('抗倒贴') || n.includes('拉扯') || n.includes('温柔恋爱') || n.includes('友好反应') || n.includes('完美恋人') },
  { folder: 'NSFW', match: n => /NSFW|防止发情|弥赛亚|涩涩|性爱|补丁-|体型差|风格-海棠|风格-温柔/.test(n) },
  { folder: '基调', match: n => TONES.some(t => n.includes(t.replace(/^\s+/, ''))) || n.includes('基调') },
  { folder: '文风', match: n => n.includes('文风') || n.startsWith('📜') },
  { folder: '基础需求', match: n => PERSONS.includes(n) || GRABS.includes(n) || PSY.some(p => n.includes('心理活动')) || n.includes('正文要求') || n.includes('外貌') || n.includes('服饰') || n.includes('对话增加') || n.includes('防止占有') || n.includes('防止转折') || n.includes('基础需求') },
  { folder: '优化', match: n => n.includes('优化') && !n.includes('NSFW') },
  { folder: '格式栏', match: n => n.includes('功能') || n.startsWith('├') || n.includes('一键开关') },
  { folder: '系统槽', match: n => false },
];

void RECEIVERS;
