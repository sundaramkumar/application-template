import { createContext, useContext, useEffect, useState } from 'react';

export type Accent = 'maroon' | 'purple' | 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo'
  | 'forest' | 'ocean' | 'plum' | 'terracotta' | 'graphite' | 'custom';
export type Mode   = 'light'  | 'dark' | 'system';
export type SidebarStyle = 'light' | 'dark' | 'gradient';
export type WaveStyle    = 'none' | 'flow' | 'ribbon' | 'aurora' | 'dots' | 'topo';
export type FontId       = 'inter' | 'geist' | 'jakarta' | 'manrope' | 'dmsans' | 'plex' | 'outfit';

export const FONTS: { id: FontId; label: string; family: string; google: string; note: string }[] = [
  { id: 'inter',   label: 'Inter',        family: '"Inter"',             google: 'Inter:wght@400;500;600;700',                       note: 'Neutral classic' },
  { id: 'geist',   label: 'Geist',        family: '"Geist"',             google: 'Geist:wght@400;500;600;700',                       note: 'Crisp & technical' },
  { id: 'jakarta', label: 'Plus Jakarta', family: '"Plus Jakarta Sans"', google: 'Plus+Jakarta+Sans:wght@400;500;600;700',           note: 'Friendly & modern' },
  { id: 'manrope', label: 'Manrope',      family: '"Manrope"',           google: 'Manrope:wght@400;500;600;700',                     note: 'Geometric' },
  { id: 'dmsans',  label: 'DM Sans',      family: '"DM Sans"',           google: 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700', note: 'Soft & rounded' },
  { id: 'plex',    label: 'IBM Plex',     family: '"IBM Plex Sans"',     google: 'IBM+Plex+Sans:wght@400;500;600;700',               note: 'Corporate' },
  { id: 'outfit',  label: 'Outfit',       family: '"Outfit"',            google: 'Outfit:wght@400;500;600;700',                      note: 'Bold display' },
];

/** Load a Google font on demand (once). */
export function ensureFont(id: FontId) {
  const f = FONTS.find(x => x.id === id);
  if (!f || document.getElementById(`font-${id}`)) return;
  const link = document.createElement('link');
  link.id = `font-${id}`;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
  document.head.appendChild(link);
}

interface ThemeCtx {
  accent:      Accent;
  mode:        Mode;
  customColor: string;
  bg:          string;        // '' = follow the theme's default page background; 'tinted' = a tint of the theme colour
  font:        FontId;
  sidebar:     SidebarStyle;
  wave:        WaveStyle;
  setAccent:      (a: Accent) => void;
  setMode:        (m: Mode)   => void;
  setCustomColor: (c: string) => void;
  setBg:          (c: string) => void;
  setFont:        (f: FontId) => void;
  setSidebar:     (s: SidebarStyle) => void;
  setWave:        (w: WaveStyle) => void;
}

/** Default theme colour, applied through the custom-colour accent. */
export const DEFAULT_THEME_COLOR = '#24948a';

const Ctx = createContext<ThemeCtx>({
  accent: 'custom', mode: 'system', customColor: DEFAULT_THEME_COLOR, bg: '', font: 'inter', sidebar: 'gradient', wave: 'none',
  setAccent: () => {}, setMode: () => {}, setCustomColor: () => {}, setBg: () => {}, setFont: () => {}, setSidebar: () => {}, setWave: () => {},
});

export const useTheme = () => useContext(Ctx);

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function deriveAccentVars(hex: string) {
  const [h, s, l] = hexToHsl(hex);
  return {
    '--accent-50':    hslToHex(h, clamp(s, 20, 60),  97),
    '--accent-100':   hslToHex(h, clamp(s, 30, 70),  93),
    '--accent-600':   hex,
    '--accent-700':   hslToHex(h, s, clamp(l - 12, 15, 85)),
    '--sidebar-from': hslToHex(h, clamp(s + 10, 50, 100), clamp(l - 28, 10, 40)),
    '--sidebar-via':  hex,
    '--sidebar-to':   hslToHex((h + 22) % 360, clamp(s - 5, 40, 100), clamp(l + 14, 40, 75)),
  };
}

const CUSTOM_VARS = ['--accent-50','--accent-100','--accent-600','--accent-700',
                     '--sidebar-from','--sidebar-via','--sidebar-to'];

function applyCustomVars(vars: Record<string, string>) {
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}
function clearCustomVars() {
  CUSTOM_VARS.forEach(k => document.documentElement.style.removeProperty(k));
}
function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}
/** Override the page background with the user's choice — light mode only, so it
    never clobbers the dark palette. Empty/invalid falls back to the theme's bg. */
function applyBg(bg: string, dark: boolean) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(bg);
  if (valid && !dark) document.documentElement.style.setProperty('--color-bg', bg);
  else document.documentElement.style.removeProperty('--color-bg');
  document.documentElement.dataset.content = bg === 'tinted' ? 'tinted' : '';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<Accent>(() =>
    (localStorage.getItem('app-accent') || 'custom') as Accent
  );
  const [mode, setModeState] = useState<Mode>(() =>
    (localStorage.getItem('app-mode') || 'system') as Mode
  );
  const [customColor, setCustomColorState] = useState<string>(() =>
    localStorage.getItem('app-custom-color') || DEFAULT_THEME_COLOR
  );
  const [bg, setBgState] = useState<string>(() =>
    localStorage.getItem('app-bg') || ''
  );
  const [font, setFontState] = useState<FontId>(() => {
    const f = localStorage.getItem('app-font') as FontId | null;
    return FONTS.some(x => x.id === f) ? f! : 'inter';
  });
  const [sidebar, setSidebarState] = useState<SidebarStyle>(() => {
    const v = localStorage.getItem('app-sidebar');
    return v === 'light' || v === 'dark' ? v : 'gradient';
  });
  const [wave, setWaveState] = useState<WaveStyle>(() => {
    const v = localStorage.getItem('app-wave') as WaveStyle | null;
    return v && ['flow', 'ribbon', 'aurora', 'dots', 'topo'].includes(v) ? v : 'none';
  });

  useEffect(() => {
    localStorage.setItem('app-font', font);
    ensureFont(font);
    const f = FONTS.find(x => x.id === font) ?? FONTS[0];
    document.documentElement.style.setProperty('--font-sans', `${f.family}, -apple-system, BlinkMacSystemFont, sans-serif`);
  }, [font]);

  useEffect(() => {
    localStorage.setItem('app-sidebar', sidebar);
    localStorage.setItem('app-wave', wave);
    document.documentElement.dataset.sidebar = sidebar;
    document.documentElement.dataset.wave = wave;
  }, [sidebar, wave]);

  useEffect(() => {
    localStorage.setItem('app-accent', accent);
    if (accent === 'custom') {
      document.documentElement.setAttribute('data-accent', 'custom');
      applyCustomVars(deriveAccentVars(customColor));
    } else {
      clearCustomVars();
      document.documentElement.setAttribute('data-accent', accent);
    }
  }, [accent, customColor]);

  useEffect(() => {
    localStorage.setItem('app-mode', mode);
    localStorage.setItem('app-bg', bg);
    const apply = (dark: boolean) => { applyDark(dark); applyBg(bg, dark); };
    if (mode === 'light')  { apply(false); return; }
    if (mode === 'dark')   { apply(true);  return; }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, bg]);

  const setAccent = (a: Accent) => { setAccentState(a); };
  const setMode   = (m: Mode)   => { setModeState(m); };
  const setCustomColor = (c: string) => {
    localStorage.setItem('app-custom-color', c);
    setCustomColorState(c);
  };
  const setBg = (c: string) => { setBgState(c); };
  const setFont    = (f: FontId)       => setFontState(f);
  const setSidebar = (s: SidebarStyle) => setSidebarState(s);
  const setWave    = (w: WaveStyle)    => setWaveState(w);

  return (
    <Ctx.Provider value={{ accent, mode, customColor, bg, font, sidebar, wave, setAccent, setMode, setCustomColor, setBg, setFont, setSidebar, setWave }}>
      {children}
    </Ctx.Provider>
  );
}
