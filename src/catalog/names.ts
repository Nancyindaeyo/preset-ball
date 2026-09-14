/** 蛾摩拉 2.6 条目名。匹配时会 trim，不必抄装饰空格。 */

export const N = {
  setKeep: 'set-不要关',
  gemini429: '🔹Gemini防429',
  geminiHead: '🔹Gemini头部',
  identity3: '身份定义3',
  noPrefillBottom: '🔹无预填底部|3.5/3.6用',
  prefillBottom: '🔹预填充底部|3.5勿开',
  noThinkBottom: '🔹G无思维链底部|3.5勿开',
  streamCut1: '🔹抗流式截断',
  streamCut2: '🔹抗流式截断2',
  bottomBreak1: '🔹底部破限1',

  skeletonFixed: '→ 固定思维链',
  skeletonFanFull: '→ 同人思维链（完整）',
  skeletonFanShort: '→ 同人思维链',
  skeletonChar: '→ 角色卡思维',
  skeletonFree: '→ 自由思维链',
  skeleton36: '→ 3.6短思维链',
  sceneCot: '💭重现与场景',
  mainCot: '→ 主线CoT',
  onlineCot: '→ 线上CoT',
  cotNormal: '← 常规CoT',
  cotSilent: '← 缄默CoT',
  cotAntiGrab: '← 防抢CoT',
  cotEmotion: '← 情感CoT',
  cotCut: '← 防截CoT',
  cotStyle: '← 文风CoT@K',

  fanOpt: '♤同人卡优化',
  toneFan: '泡泡宇宙·同人',
  toneDaily: '宇宙拿铁·日常',
  toneDrama: '零龄主序·正剧',
  toneLove: '潮汐锁定·热恋',
  tonePull: '洛希极限·拉扯',
  toneCruel: '热寂之时·残酷',

  cal: '- 人物性格校准',
  ooc: '◑ OOC优化',
  stereo: '♧抗刻板优化',
  alive: '💡活人',
  independent: '💡独立',
  antiBot: '✣抗人机优化',
  antiOmni: '♮抗全知优化',
  feeling: '❥感情深优化',
  dim: '- 情感维度',
  sweetBrain: '➹温柔恋爱脑',
  antiDom: '♡抗支配优化',
  antiCling: '♬抗倒贴优化',
  pull: '💡拉扯',
  friendly: '☫友好反应框架',
  perfect: '☫完美恋人基调',

  scanRespect: '❃请你学会尊重',
  scanLang: '❃语言表达禁令',
  scanWarm: '❃增加恋爱温度',
  scanLogic: '❃调整情感逻辑',
  scanCot: '❃情感扫描CoT',
  scanRecv: '情感扫描一键开关',

  nsfwThink: '🔞NSFW思考',
  nsfwRecv: 'NSFW一键开关',
  nsfwWeimei: '🔞风格-温柔唯美',
  nsfwHaitang: '🔞风格-海棠直白',
  nsfwFlow: '🔞性爱流程',
  nsfwOpt1: '♨NSFW优化1',
  nsfwOpt2: '♨NSFW优化2',
  noHorny: '✘ 防止发情',
  nsfwMulti: '🔞多人性爱',
  nsfwBL: '🔞补丁-BL特化',
  nsfwBG: '🔞补丁-BG特化',
  nsfwGL: '🔞补丁-GL特化',
  nsfwFuta: '🔞补丁-双性特化',
  nsfwSize: '🔞通用体型差',
  nsfwProlong: '☫延长涩涩时间',

  recvBase: '基础需求一键开关',
  recvOpt: '优化分区一键开关',
  recvSilent: '缄默法则一键开关',
  recvFmt: '功能分区一键开关',
  recvAuthor: '蛾摩拉说一键开关',
} as const;

export const SKELETONS = [
  N.skeletonFixed,
  N.skeletonFanFull,
  N.skeletonFanShort,
  N.skeletonChar,
  N.skeletonFree,
  N.skeleton36,
];

export const NOVEL_TYPES = [
  '群像',
  '言情',
  '四爱',
  '双女主',
  '双男主主攻',
  '双男主主受',
  '<user>中心',
  '单人卡<char>中心',
  '多人卡随机角色中心',
];

export const PERSONS = ['果实漂浮人称', 'char第一人称', 'user第一人称', 'user第二人称', '旁观第三人称'];

export const GRABS = ['✎ 不许抢话', '✎ 完全扩写', '✎ 转述抢话'];

export const TONES = [N.toneDaily, N.toneDrama, N.toneLove, N.toneFan, N.tonePull, N.toneCruel];

export const PSY = ['♫ 心理活动(有颜色)', '♫ 心理活动(无颜色)'];

export const NSFW_STYLES = [N.nsfwWeimei, N.nsfwHaitang];

export const NSFW_PATCHES = [N.nsfwBL, N.nsfwBG, N.nsfwGL, N.nsfwFuta];

export const SMALL_COT = [N.cotNormal, N.cotSilent, N.cotAntiGrab];

export const BODY_LEN = ['✉正文要求-长', '✉正文要求-短'];

export const STYLES = [
  '海棠R18文风',
  'PO18文学文风',
  '📜现实',
  '文风-拉美禁忌爱情@natami',
  '文风-成人童话@natami@yuki',
  '文风-余温二改@无尽夏',
  '文风-恋爱喜剧@电波系',
  '文风-克制白描@电波系',
  '文风-意识流@电波系',
  '文风-半句情话@K',
  '文风-通俗文学毛姆',
  '文风-命运之爱@K',
  '文风-少年心绪@K',
  '文风-古风通用',
  '文风-女频爽文',
  '文风-诗童话',
  '文风-轻小说',
  '文风-简媜',
  '文风-金庸',
  '文风-自由',
  '☑自缝文风1',
  '☑自缝文风2',
  '☑自缝文风3',
  '☑自缝文风4',
  '文风-阴郁纪实@NATAMI',
  '文风-左翼现代情色@natami',
];

export const RECEIVERS = [
  N.recvBase,
  N.recvOpt,
  N.nsfwRecv,
  N.scanRecv,
  N.recvSilent,
  N.recvFmt,
  N.recvAuthor,
];

export const ASSISTANT_BOTTOMS = [N.prefillBottom, N.noThinkBottom];

export const SYSTEM_NAMES = new Set([
  'Agent System Prompt',
  'Agent Task',
  'Agent Results',
  'Chat History',
  'Chat Examples',
  'main',
  'charDescription',
  'charPersonality',
  'worldInfoBefore',
  'worldInfoAfter',
  'personaDescription',
  'jailbreak',
  'nsfw',
  'dialogueExamples',
  '♔<user>设定',
  '✪角色定义之前',
  '♚<char>设定',
  '♚<char>个性',
  '✪角色定义之后',
]);

export const FAN_RELATED = [N.skeletonFanFull, N.skeletonFanShort, N.fanOpt, N.toneFan];

export const SCAN_GROUP = [N.scanRespect, N.scanLang, N.scanWarm, N.scanLogic, N.scanCot, N.scanRecv];

export const ALWAYS_OFF = [N.nsfwOpt1, N.nsfwOpt2, N.cotEmotion, N.cotCut, N.nsfwFlow, N.prefillBottom];
