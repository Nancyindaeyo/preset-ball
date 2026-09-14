const THEME_VARS = [
  '--SmartThemeBodyColor',
  '--SmartThemeEmColor',
  '--SmartThemeBorderColor',
  '--SmartThemeQuoteColor',
  '--SmartThemeBlurTintColor',
  '--SmartThemeShadowColor',
  '--SmartThemeBlurStrength',
  '--SmartThemeChatTintColor',
  '--SmartThemeUserMesBlurTintColor',
  '--SmartThemeBotMesBlurTintColor',
  '--mainFontSize',
  '--fontFamily',
] as const;

/** 把酒馆页面上的主题变量拷进 shadow host，换美化会跟着变。 */
export function copyThemeVars(target: HTMLElement): void {
  const src = getComputedStyle(document.documentElement);
  for (const name of THEME_VARS) {
    const value = src.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  }
  const body = getComputedStyle(document.body);
  const bg = body.backgroundColor;
  if (bg) target.style.setProperty('--pb-page-bg', bg);
}

export function watchTheme(target: HTMLElement): () => void {
  copyThemeVars(target);
  const mo = new MutationObserver(() => copyThemeVars(target));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
  mo.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
  const poll = window.setInterval(() => copyThemeVars(target), 4000);
  return () => {
    mo.disconnect();
    window.clearInterval(poll);
  };
}
