import { reactive } from 'vue';

export type View =
  | { name: 'home' }
  | { name: 'profile-edit'; id: string }
  | { name: 'rule-edit'; id: string; from?: View }
  | { name: 'rule-create' }
  | { name: 'group-edit'; group: string }
  | { name: 'fine' }
  | { name: 'lore-pick' };

export const ui = reactive({
  sheet: false,
  view: { name: 'home' } as View,
});

export function openSheet(): void {
  ui.sheet = true;
  ui.view = { name: 'home' };
}

export function closeSheet(): void {
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
