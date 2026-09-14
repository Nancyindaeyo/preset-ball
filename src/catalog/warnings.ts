import type { NamedState } from '@/host/prompts';
import { findInStates, normName } from '@/host/prompts';
import type { Rule, Warning } from '@/types';
import { N, RECEIVERS, SKELETONS, TONES } from './names';

export function detectWarnings(states: NamedState[], rules: Rule[]): Warning[] {
  const warnings: Warning[] = [];
  const on = (name: string) => findInStates(states, name)?.enabled === true;

  for (const rule of rules) {
    if (rule.kind !== 'mutex') continue;
    const lit = rule.entries.filter(n => on(n));
    if (lit.length > 1) {
      warnings.push({
        id: `mutex:${rule.id}`,
        text: `「${rule.name}」同时开了 ${lit.length} 条（${lit.slice(0, 3).join('、')}${lit.length > 3 ? '…' : ''}）。同变量只生效后写的那条，请只留一条。`,
      });
    }
  }

  const skOn = SKELETONS.filter(n => on(n));
  if (skOn.length > 1) {
    warnings.push({
      id: 'skeleton-multi',
      text: `思维链开了 ${skOn.length} 条。请只留一条，否则会写两遍作文。`,
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

export function mutexRepair(
  states: NamedState[],
  rules: Rule[],
  justEnabled?: string,
): Array<{ name: string; enabled: boolean }> {
  const changes: Array<{ name: string; enabled: boolean }> = [];
  for (const rule of rules) {
    if (rule.kind !== 'mutex') continue;
    const lit = rule.entries.filter(n => findInStates(states, n)?.enabled);
    if (lit.length <= 1) continue;
    const keep = justEnabled && lit.includes(justEnabled) ? justEnabled : lit[lit.length - 1];
    for (const n of lit) {
      if (n !== keep) changes.push({ name: n, enabled: false });
    }
  }
  return changes;
}
