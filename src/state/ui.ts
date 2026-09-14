import { reactive } from 'vue';

export type View =
  | { name: 'home' }
  | { name: 'profile-edit'; id: string }
  | { name: 'rule-edit'; id: string }
  | { name: 'rule-create' }
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
