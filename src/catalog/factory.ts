import type { JailbreakTier, Profile, Rule } from '@/types';
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
  SCAN_GROUP,
  SKELETONS,
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
    level: extra.level,
    packGroup: extra.packGroup,
  };
}

function mutex(id: string, name: string, entries: string[], hint?: string, section: Rule['section'] = 'fine'): Rule {
  return { id, name, kind: 'mutex', builtin: id, section, hint, entries };
}

function group(id: string, name: string, entries: string[], hint?: string, section: Rule['section'] = 'quick'): Rule {
  return { id, name, kind: 'group', builtin: id, section, hint, entries };
}

export const FACTORY_RULES: Rule[] = [
  mutex('mutex-skeleton', '思维链（只能开一条）', SKELETONS, '开两条等于抢作业，模型会写两遍作文。', 'quick'),
  mutex('mutex-type', '小说类型', NOVEL_TYPES, '多人后宫用 <user>中心，不要开群像。'),
  mutex('mutex-person', '人称', PERSONS),
  mutex('mutex-grab', '怎么处理你的输入', GRABS),
  mutex('mutex-tone', '小说基调', TONES, '同人用泡泡宇宙；原创不要留着同人基调。'),
  mutex('mutex-style', '文风', STYLES, '只开一个。'),
  mutex('mutex-psy', '心理活动颜色', PSY),
  mutex('mutex-nsfw-style', 'NSFW 文笔', NSFW_STYLES, '海棠和唯美同变量，只能留一个。', 'quick'),
  mutex('mutex-nsfw-patch', 'NSFW 性向补丁', NSFW_PATCHES),
  mutex('mutex-small-cot', '正文小 CoT', SMALL_COT, '和长思维链同开会写两遍。Gemini 默认全关。'),
  mutex('mutex-body-len', '正文长短', BODY_LEN),

  group(
    'group-persona',
    '人设三条',
    [N.cal, N.ooc, N.stereo],
    '一般常开。和伦理包不是同一层。',
    'quick',
  ),
  group('group-alive', '人设立体（可选）', [N.alive, N.independent, N.antiBot, N.antiOmni, N.feeling, N.dim], undefined, 'fine'),

  pack('pack-original', '骨架：原创', {
    hint: '固定思维链。关掉同人相关。',
    on: {
      enable: [N.skeletonFixed],
      disable: [...FAN_RELATED, N.skeletonChar, N.skeletonFree, N.skeleton36],
    },
  }),
  pack('pack-fanfic', '骨架：同人', {
    hint: '同人完整链 + 同人优化 + 泡泡宇宙。',
    on: {
      enable: [N.skeletonFanFull, N.fanOpt, N.toneFan],
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
      ],
    },
  }),
  pack('pack-charcard', '骨架：角色卡', {
    hint: '关同人，开固定链。其他条目随你细调。',
    on: {
      enable: [N.skeletonFixed],
      disable: FAN_RELATED,
    },
  }),
  pack('pack-light', '少作业', {
    hint: '换成 3.6 短链。库可以继续开。',
    on: {
      enable: [N.skeleton36, N.sceneCot],
      disable: [
        N.skeletonFixed,
        N.skeletonFanFull,
        N.skeletonFanShort,
        N.skeletonChar,
        N.skeletonFree,
        N.mainCot,
        ...SMALL_COT,
      ],
    },
  }),

  pack('pack-nsfw', 'NSFW', {
    hint: '开思考和接收器。文笔用你上次选的。关闸出厂会开回防止发情，可在规则里去掉。',
    on: {
      enable: [N.nsfwThink, N.nsfwRecv],
      disable: [N.noHorny, N.nsfwFlow, N.nsfwOpt1, N.nsfwOpt2],
    },
    off: {
      enable: [N.noHorny],
      disable: [N.nsfwThink, N.nsfwWeimei, N.nsfwHaitang, N.nsfwFlow, N.nsfwOpt1, N.nsfwOpt2, N.nsfwRecv],
    },
  }),

  pack('ethics-healthy', '伦理：健康言情', {
    packGroup: 'ethics',
    hint: '扫描里留尊重、禁令、逻辑。不要温柔恋爱脑。',
    on: {
      enable: [N.scanRespect, N.scanLang, N.scanLogic, N.scanCot, N.scanRecv],
      disable: [N.sweetBrain, N.nsfwHaitang, N.friendly, N.perfect],
    },
  }),
  pack('ethics-slow', '伦理：慢热 / 群像', {
    packGroup: 'ethics',
    hint: '抗倒贴 + 拉扯。关掉恋爱温度和热恋基调。',
    on: {
      enable: [N.antiCling, N.pull, N.scanLogic, N.scanLang],
      disable: [N.scanWarm, N.toneLove, N.sweetBrain, N.friendly, N.perfect],
    },
  }),
  pack('ethics-haitang', '伦理：强势 / 海棠', {
    packGroup: 'ethics',
    hint: '和抗支配、恋爱温度、语言禁令打架，会帮你关掉。',
    on: {
      enable: [N.nsfwHaitang],
      disable: [N.antiDom, N.scanWarm, N.scanRespect, N.scanLang, N.sweetBrain],
    },
  }),
  pack('ethics-dark', '伦理：病娇 / 黑暗', {
    packGroup: 'ethics',
    hint: '按人设写。关掉扫描整组和倒贴/支配禁令。',
    on: {
      enable: [N.dim, N.alive],
      disable: [N.antiDom, N.antiCling, ...SCAN_GROUP, N.sweetBrain, N.perfect, N.friendly],
    },
  }),

  pack('jb-check', '破限：关掉底部 assistant', {
    section: 'quick',
    hint: 'Gemini 3.5 请求末尾不能是模型条，否则 400。',
    on: { enable: [], disable: ASSISTANT_BOTTOMS },
  }),
];

export const JAILBREAK_TIERS: JailbreakTier[] = [
  {
    level: 1,
    name: '日常',
    hint: '防 429 + 身份 + 无预填底部',
    entries: [N.setKeep, N.gemini429, N.identity3, N.noPrefillBottom],
  },
  {
    level: 2,
    name: '非流拒写',
    hint: '加上 Gemini 头部',
    entries: [N.geminiHead],
  },
  {
    level: 3,
    name: '流式中断',
    hint: '加上底部破限 1',
    entries: [N.bottomBreak1],
  },
  {
    level: 4,
    name: '仍截断',
    hint: '加上抗流式截断 2。还不够再去细调开插符那条。',
    entries: [N.streamCut2],
  },
];

export const FACTORY_PROFILES: Profile[] = [
  {
    id: 'pf-original',
    name: '原创',
    kind: 'patch',
    builtin: 'pf-original',
    updatedAt: 0,
    enable: [N.skeletonFixed, N.cal, N.ooc, N.stereo],
    disable: [...FAN_RELATED, N.skeletonChar, N.skeletonFree, N.skeleton36, N.friendly, N.perfect, N.sweetBrain, ...ALWAYS_OFF],
  },
  {
    id: 'pf-fanfic',
    name: '同人',
    kind: 'patch',
    builtin: 'pf-fanfic',
    updatedAt: 0,
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
