export type Theme = "light" | "dark";

export const THEME_KEY = "theme";
export const BOOT_KEY = "booted";

/**
 * Runs in <head> before first paint: resolves the theme (saved choice, else OS)
 * and decides whether the hero boot sequence plays (home page, first visit this
 * session, motion allowed). Everything is wrapped so storage errors never break
 * the page.
 */
export const headScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.dataset.theme=t}catch(e){d.dataset.theme="dark"}try{if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem("${BOOT_KEY}")){d.dataset.boot="play"}}catch(e){}})();`;

export function currentTheme(): Theme {
   return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function saveTheme(theme: Theme) {
   try {
      localStorage.setItem(THEME_KEY, theme);
   } catch {
      // storage unavailable; the choice just won't persist
   }
}
