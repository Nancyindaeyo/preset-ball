/** 主页分组：多条规则的用 group-edit，一条的直接进 rule-edit。 */

export interface HomeSection {
  title: string;
  ruleIds: string[];
  /** 互斥时写入 Rule.packGroup 的键 */
  exclusiveKey?: string;
}

export const HOME_SECTIONS: Record<string, HomeSection> = {
  skeleton: {
    title: '骨架',
    ruleIds: ['pack-original', 'pack-fanfic', 'pack-charcard', 'pack-light'],
    exclusiveKey: 'skeleton',
  },
  ethics: {
    title: '恋爱伦理',
    ruleIds: ['ethics-healthy', 'ethics-slow', 'ethics-haitang', 'ethics-dark'],
    exclusiveKey: 'ethics',
  },
  persona: {
    title: '人设三条',
    ruleIds: ['group-persona'],
  },
  nsfw: {
    title: 'NSFW',
    ruleIds: ['pack-nsfw'],
  },
};
