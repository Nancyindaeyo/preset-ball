import type { FineFolder } from '@/types';
import type { NamedState } from '@/host/prompts';
import { FOLDER_HINTS } from './factory';
import { N, RECEIVERS, SYSTEM_NAMES } from './names';

export function isDivider(name: string): boolean {
  return /[─━┌┐└┘┏┓┗┛├┤]/.test(name) || name.includes('———') || name.includes('★₊');
}

export function isSystemName(name: string): boolean {
  return SYSTEM_NAMES.has(name);
}

export function isReceiver(name: string): boolean {
  return (RECEIVERS as readonly string[]).includes(name) || name.includes('一键开关');
}

export function isMothraPreset(states: NamedState[]): boolean {
  const names = new Set(states.map(s => s.name));
  let hits = 0;
  for (const r of RECEIVERS) if (names.has(r)) hits += 1;
  return hits >= 3 || names.has(N.skeletonFixed) || names.has(N.recvAuthor);
}

export function folderOf(name: string, system: boolean, layout?: FineFolder[]): string {
  if (system || isSystemName(name)) return '系统槽';
  if (isDivider(name)) return '分隔';
  if (layout?.length) {
    const hit = layout.find(f => f.entries.includes(name));
    if (hit) return hit.name;
    return '未分组';
  }
  for (const h of FOLDER_HINTS) {
    if (h.match(name)) return h.folder;
  }
  return '其他';
}
