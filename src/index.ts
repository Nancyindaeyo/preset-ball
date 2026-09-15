import App from '@/ui/App.vue';
import {
  bootStore,
  persistSettings,
  resetAllRules,
  restoreFactoryProfiles,
  settings,
  unbindHostEvents,
} from '@/state/store';
import { copyThemeVars, watchTheme } from '@/host/theme';
import { versionedAssetUrl } from '@/version';
import { createApp, type App as VueApp } from 'vue';
import '@/styles.css';

const HOST_ID = 'preset-ball-host';
const SETTINGS_ID = 'preset-ball-settings';
/** 热重载会再执行一遍模块，旧闭包够不到；挂到 window 才能拆掉上一份监听。 */
const CLEANUP_KEY = '__presetBallCleanup';
const SETTINGS_TRIES = 40;

type CleanupFn = () => void;

let app: VueApp | undefined;
let stopTheme: (() => void) | undefined;
let settingsTimer = 0;
let settingsTries = 0;

function previousCleanup(): CleanupFn | undefined {
  const fn = (window as unknown as Record<string, unknown>)[CLEANUP_KEY];
  return typeof fn === 'function' ? (fn as CleanupFn) : undefined;
}

function registerCleanup(fn: CleanupFn): void {
  (window as unknown as Record<string, unknown>)[CLEANUP_KEY] = fn;
}

function disposeRuntime(): void {
  if (settingsTimer) {
    window.clearTimeout(settingsTimer);
    settingsTimer = 0;
  }
  window.removeEventListener('pagehide', disposeRuntime);
  stopTheme?.();
  stopTheme = undefined;
  app?.unmount();
  app = undefined;
  document.getElementById(HOST_ID)?.remove();
  unbindHostEvents();
  if (previousCleanup() === disposeRuntime) {
    delete (window as unknown as Record<string, unknown>)[CLEANUP_KEY];
  }
}

function mountUi(): void {
  document.getElementById(HOST_ID)?.remove();
  stopTheme?.();
  app?.unmount();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:static;';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  copyThemeVars(host);
  stopTheme = watchTheme(host);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versionedAssetUrl('./index.css', import.meta.url);
  shadow.appendChild(link);

  const root = document.createElement('div');
  shadow.appendChild(root);
  app = createApp(App);
  app.mount(root);
}

function unmountUi(): void {
  stopTheme?.();
  stopTheme = undefined;
  app?.unmount();
  app = undefined;
  document.getElementById(HOST_ID)?.remove();
}

function mountSettings(): void {
  const host =
    document.querySelector('#extensions_settings') ||
    document.querySelector('#extensions_settings2') ||
    document.querySelector('.extensions_settings');
  if (!host) {
    if (settingsTries >= SETTINGS_TRIES) return;
    settingsTries += 1;
    settingsTimer = window.setTimeout(mountSettings, 400);
    return;
  }
  settingsTries = 0;
  document.getElementById(SETTINGS_ID)?.remove();
  const box = document.createElement('div');
  box.id = SETTINGS_ID;
  box.className = 'inline-drawer';
  box.innerHTML = `
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>预设悬浮球</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <label class="checkbox_label">
        <input id="pb-enable-orb" type="checkbox" />
        <span>显示悬浮球</span>
      </label>
      <button id="pb-reset-pos" class="menu_button" type="button">重置球的位置</button>
      <button id="pb-reset-rules" class="menu_button" type="button">恢复出厂规则</button>
      <button id="pb-restore-profiles" class="menu_button" type="button">补回出厂方案</button>
      <p class="opacity50p">方案和规则存在酒馆设置里，可随账号同步。球的位置只存在这台设备。</p>
    </div>
  `;
  host.appendChild(box);
  const boxEl = box.querySelector<HTMLInputElement>('#pb-enable-orb');
  if (boxEl) {
    boxEl.checked = settings.orbEnabled;
    boxEl.addEventListener('change', () => {
      settings.orbEnabled = boxEl.checked;
      persistSettings();
      if (settings.orbEnabled) mountUi();
      else unmountUi();
    });
  }
  box.querySelector('#pb-reset-pos')?.addEventListener('click', () => {
    localStorage.removeItem('preset-ball.orb.pos.v1');
    window.location.reload();
  });
  box.querySelector('#pb-reset-rules')?.addEventListener('click', () => resetAllRules());
  box.querySelector('#pb-restore-profiles')?.addEventListener('click', () => restoreFactoryProfiles());
}

function boot(): void {
  previousCleanup()?.();
  registerCleanup(disposeRuntime);
  window.addEventListener('pagehide', disposeRuntime);
  void bootStore()
    .then(() => {
      if (settings.orbEnabled) mountUi();
      mountSettings();
    })
    .catch(err => {
      console.error('[预设球] 启动失败', err);
    });
}

const jq = (window as unknown as { $? : (fn: () => void) => void }).$;
if (typeof jq === 'function') jq(boot);
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
