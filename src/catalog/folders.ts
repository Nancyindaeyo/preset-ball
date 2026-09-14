import { FOLDER_HINTS } from './factory';
import { RECEIVERS, SYSTEM_NAMES } from './names';

export function isDivider(name: string): boolean {
  return /[─━┌┐└┘┏┓┗┛├┤]/.test(name) || name.includes('———') || name.includes('★₊');
}

export function isSystemName(name: string): boolean {
  return SYSTEM_NAMES.has(name);
}

export function isReceiver(name: string): boolean {
  return (RECEIVERS as readonly string[]).includes(name) || name.includes('一键开关');
}

export function folderOf(name: string, system: boolean): string {
  if (system || isSystemName(name)) return '系统槽';
  if (isDivider(name)) return '分隔';
  for (const h of FOLDER_HINTS) {
    if (h.match(name)) return h.folder;
  }
  return '其他';
}
