import { dirty, pullFromHost, saveCurrentProfile, schemeDirty } from '@/state/store';
import { reactive } from 'vue';

export type View =
  | { name: 'home' }
  | { name: 'profile-edit'; id: string }
  | { name: 'rule-edit'; id: string; from?: View }
  | { name: 'rule-create' }
  | { name: 'fine' }
  | { name: 'group-setup' }
  | { name: 'lore-pick' };

export const ui = reactive({
  sheet: false,
  view: { name: 'home' } as View,
});

export type ConfirmChoice = 'save' | 'discard' | 'cancel';

export const confirmDlg = reactive({
  open: false,
  text: '',
  resolve: null as ((v: ConfirmChoice) => void) | null,
});

export function askConfirm(text: string): Promise<ConfirmChoice> {
  return new Promise(resolve => {
    confirmDlg.open = true;
    confirmDlg.text = text;
    confirmDlg.resolve = v => {
      confirmDlg.open = false;
      confirmDlg.resolve = null;
      resolve(v);
    };
  });
}

export function needsSave(): boolean {
  return dirty.value || schemeDirty.value;
}

export function openSheet(): void {
  ui.sheet = true;
  ui.view = { name: 'home' };
  void pullFromHost();
}

export async function closeSheet(): Promise<void> {
  if (needsSave()) {
    const choice = await askConfirm('改动还没保存到方案。关掉会丢掉这次改的。');
    if (choice === 'cancel') return;
    if (choice === 'save') await saveCurrentProfile();
  }
  ui.sheet = false;
  ui.view = { name: 'home' };
}

export function go(view: View): void {
  ui.view = view;
}

export function goHome(): void {
  ui.view = { name: 'home' };
}

export function back(): void {
  const v = ui.view;
  if (v.name === 'rule-edit' && v.from) {
    ui.view = v.from;
    return;
  }
  goHome();
}
