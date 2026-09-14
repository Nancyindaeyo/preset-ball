import App from '@/ui/App.vue';
import { bootStore, persistSettings, resetAllRules, restoreFactoryProfiles, settings } from '@/state/store';
import { copyThemeVars, watchTheme } from '@/host/theme';
import { versionedAssetUrl } from '@/version';
import { createApp } from 'vue';
import '@/styles.css';

const HOST_ID = 'preset-ball-host';
const SETTINGS_ID = 'preset-ball-settings';

function mountUi(): void {
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:static;';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  copyThemeVars(host);
  const stopTheme = watchTheme(host);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versionedAssetUrl('./index.css', import.meta.url);
  shadow.appendChild(link);

  const root = document.createElement('div');
  shadow.appendChild(root);
  const app = createApp(App);
  app.mount(root);

  window.addEventListener('pagehide', () => {
    stopTheme();
    app.unmount();
  });
}

function mountSettings(): void {
  const host =
    document.querySelector('#extensions_settings') ||
    document.querySelector('#extensions_settings2') ||
    document.querySelector('.extensions_settings');
  if (!host) {
    window.setTimeout(mountSettings, 400);
    return;
  }
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
  void bootStore()
    .then(() => {
      mountUi();
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
