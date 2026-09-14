export const PLUGIN_VERSION = __PB_VERSION__;
export const SETTINGS_KEY = 'preset_ball';
export const CHAT_META_KEY = 'preset_ball';
export const POS_KEY = 'preset-ball.orb.pos.v1';

export function versionedAssetUrl(assetPath: string, baseUrl: string): string {
  const url = new URL(assetPath, baseUrl);
  url.searchParams.set('ver', PLUGIN_VERSION);
  return url.href;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
