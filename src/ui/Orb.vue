<script setup lang="ts">
import { POS_KEY } from '@/version';
import { closeSheet, openSheet, ui } from '@/state/ui';
import { settings } from '@/state/store';
import type { OrbPos } from '@/types';
import { onMounted, onUnmounted, reactive, ref } from 'vue';

const SNAP = 52;
const SIZE = 48;
const pos = reactive<OrbPos>(loadPos());
const awake = ref(false);
let ptr: number | null = null;
let sx = 0;
let sy = 0;
let moved = 0;

function loadPos(): OrbPos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<OrbPos>;
      if (p && (p.dock === 'left' || p.dock === 'right' || p.dock === 'none')) {
        return { dock: p.dock, x: Number(p.x) || 0, y: Number(p.y) || 0 };
      }
    }
  } catch {
    /* ignore */
  }
  return {
    dock: 'right',
    x: 0,
    y: Math.max(80, Math.round(window.innerHeight * 0.72)),
  };
}

function savePos(): void {
  localStorage.setItem(POS_KEY, JSON.stringify(pos));
}

function clampY(y: number): number {
  const inset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pb-safe-b') || '0') || 0;
  const safe = Math.max(inset, 12);
  return Math.min(Math.max(y, 8), window.innerHeight - SIZE - safe);
}

function leftPx(): number {
  if (pos.dock === 'left') return 0;
  if (pos.dock === 'right') return window.innerWidth - SIZE;
  return Math.min(Math.max(pos.x, 8), window.innerWidth - SIZE - 8);
}

function onDown(e: PointerEvent): void {
  ptr = e.pointerId;
  sx = e.clientX;
  sy = e.clientY;
  moved = 0;
  awake.value = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onMove(e: PointerEvent): void {
  if (ptr !== e.pointerId) return;
  const dx = e.clientX - sx;
  const dy = e.clientY - sy;
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved < 6) return;
  pos.dock = 'none';
  pos.x = e.clientX - SIZE / 2;
  pos.y = clampY(e.clientY - SIZE / 2);
}

function onUp(e: PointerEvent): void {
  if (ptr !== e.pointerId) return;
  ptr = null;
  awake.value = false;
  if (moved < 6) {
    if (ui.sheet) closeSheet();
    else openSheet();
    return;
  }
  if (pos.x <= SNAP) pos.dock = 'left';
  else if (pos.x + SIZE >= window.innerWidth - SNAP) pos.dock = 'right';
  pos.y = clampY(pos.y);
  savePos();
}

function onResize(): void {
  pos.y = clampY(pos.y);
}

onMounted(() => {
  pos.y = clampY(pos.y);
  window.addEventListener('resize', onResize);
});
onUnmounted(() => window.removeEventListener('resize', onResize));
</script>

<template>
  <button
    v-show="settings.orbEnabled"
    class="pb-orb"
    :class="{ 'is-dock': pos.dock !== 'none', 'is-awake': awake || ui.sheet }"
    :style="{ left: `${leftPx()}px`, top: `${pos.y}px` }"
    type="button"
    aria-label="打开预设球"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <span class="pb-orb-mark" />
  </button>
</template>
