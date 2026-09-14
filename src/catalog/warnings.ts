import type { NamedState } from '@/host/prompts';
import { findInStates, normName } from '@/host/prompts';
import type { Rule, Warning } from '@/types';
import { HOME_SECTIONS } from './groups';
import { N, RECEIVERS, SKELETONS, TONES } from './names';

function packLit(rule: Rule, on: (n: string) => boolean): boolean {
  if (rule.kind !== 'pack' || !rule.on) return false;
  if (!rule.on.enable.length) return rule.on.disable.every(n => !on(n));
  return rule.on.enable.every(n => on(n));
}

function shortRule(name: string): string {
  return name.replace(/^伦理：/, '').replace(/^骨架：/, '');
}

function overlapWarnings(statesOn: (n: string) => boolean, rules: Rule[]): Warning[] {
  const out: Warning[] = [];
  for (const [key, spec] of Object.entries(HOME_SECTIONS)) {
    if (spec.ruleIds.length < 2) continue;
    const members = spec.ruleIds
      .map(id => rules.find(r => r.id === id))
      .filter((r): r is Rule => r != null && r.kind === 'pack');
    const lit = members.filter(r => packLit(r, statesOn));
    if (lit.length < 2) continue;
    const clashes: string[] = [];
    for (let i = 0; i < lit.length; i++) {
      for (let j = i + 1; j < lit.length; j++) {
        const a = lit[i];
        const b = lit[j];
        const aKillsB = (a.on?.disable ?? []).filter(n => (b.on?.enable ?? []).includes(n));
        const bKillsA = (b.on?.disable ?? []).filter(n => (a.on?.enable ?? []).includes(n));
        if (aKillsB.length) {
          clashes.push(
            `「${shortRule(a.name)}」要关「${aKillsB.slice(0, 2).join('、')}」，「${shortRule(b.name)}」要开它`,
          );
        }
        if (bKillsA.length) {
          clashes.push(
            `「${shortRule(b.name)}」要关「${bKillsA.slice(0, 2).join('、')}」，「${shortRule(a.name)}」要开它`,
          );
        }
      }
    }
    const names = lit.map(r => shortRule(r.name)).join('、');
    const extra = clashes.length ? clashes.slice(0, 2).join('；') + '。' : '出厂规则通常只开一个。';
    out.push({
      id: `overlap:${key}`,
      text: `「${spec.title}」同时亮了${names}。${extra}可以叠，觉得不对就关掉其中一个，或点铅笔改规则。`,
    });
  }
  return out;
}

export function detectWarnings(states: NamedState[], rules: Rule[]): Warning[] {
  const warnings: Warning[] = [];
  const on = (name: string) => findInStates(states, name)?.enabled === true;

  warnings.push(...overlapWarnings(on, rules));

  for (const rule of rules) {
    if (!packLit(rule, on) || !rule.on) continue;
    const leftover = (rule.on.disable ?? []).filter(n => on(n));
    if (!leftover.length) continue;
    warnings.push({
      id: `pack-clash:${rule.id}`,
      text: `「${shortRule(rule.name)}」亮着，但它要关掉的「${leftover.slice(0, 3).join('、')}${leftover.length > 3 ? '…' : ''}」还开着。可以叠，觉得不对就点铅笔改这条规则。`,
    });
  }

  for (const rule of rules) {
    if (rule.kind !== 'mutex') continue;
    const lit = rule.entries.filter(n => on(n));
    if (lit.length > 1) {
      warnings.push({
        id: `mutex:${rule.id}`,
        text: `「${rule.name}」同时开了 ${lit.length} 条（${lit.slice(0, 3).join('、')}${lit.length > 3 ? '…' : ''}）。同变量只生效后写的那条。可以叠，觉得不对就自己关。`,
      });
    }
  }

  const skOn = SKELETONS.filter(n => on(n));
  if (skOn.length > 1) {
    warnings.push({
      id: 'skeleton-multi',
      text: `思维链开了 ${skOn.length} 条。会写两遍作文。可以叠，觉得不对就自己关。`,
    });
  }

  if (on(N.nsfwThink) && on(N.noHorny)) {
    warnings.push({
      id: 'nsfw-vs-nohorny',
      text: 'NSFW 思考和「防止发情」同时开着，会互相打架。一般开黄就关掉防止发情。',
    });
  }

  if (on(N.nsfwThink) && !on(N.nsfwRecv)) {
    warnings.push({
      id: 'nsfw-recv',
      text: 'NSFW 弹药开着，但「NSFW一键开关」关着。蛾摩拉靠这个接收器把内容送进上下文，现在等于没开。',
    });
  }

  const scanAmmo = ['❃请你学会尊重', '❃语言表达禁令', '❃增加恋爱温度', '❃调整情感逻辑', '❃情感扫描CoT'];
  if (scanAmmo.some(n => on(n)) && !on(N.scanRecv)) {
    warnings.push({
      id: 'scan-recv',
      text: '情感扫描条目开着，但「情感扫描一键开关」关着，扫描规则进不去上下文。',
    });
  }

  const tonesOn = TONES.filter(n => on(n));
  if (tonesOn.length > 1) {
    warnings.push({
      id: 'tone-multi',
      text: `基调开了不止一个：${tonesOn.join('、')}。会并排打架。`,
    });
  }

  if (on(N.sweetBrain) && on(N.alive)) {
    warnings.push({
      id: 'sweet-vs-alive',
      text: '「温柔恋爱脑」会覆盖人设，和「活人」同时开等于让模型忽略性格。',
    });
  }

  if (on(N.antiDom) && on(N.nsfwHaitang)) {
    warnings.push({
      id: 'dom-vs-haitang',
      text: '抗支配和海棠直白同时开着。一个要平等，一个要权力感，请留一边。',
    });
  }

  if (on(N.prefillBottom) || on(N.noThinkBottom)) {
    warnings.push({
      id: 'assistant-bottom',
      text: '底部还有 assistant 预填条目。Gemini 3.5 起请求以模型条结尾会 400。点快捷里的「关掉底部 assistant」。',
    });
  }

  if (on(N.skeletonFanFull) && on(N.skeletonFixed)) {
    warnings.push({
      id: 'fan-fixed',
      text: '同人完整链和固定链同时开着。同人/原创骨架互斥，请只留一条。',
    });
  }

  const recvOffAmmo: Array<[string, string[]]> = [
    [N.recvOpt, ['♧抗刻板优化', '◑ OOC优化', '♡抗支配优化', '♬抗倒贴优化', '♤同人卡优化']],
  ];
  for (const [recv, ammo] of recvOffAmmo) {
    if (!on(recv) && ammo.some(a => on(a))) {
      warnings.push({
        id: `recv:${recv}`,
        text: `「${recv}」关着，但分区里还有开着的条目。不开接收器，那些条目进不去。`,
      });
    }
  }

  void RECEIVERS;
  void normName;
  return warnings;
}
