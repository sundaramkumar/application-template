import { useRef, useState } from 'react';
import { Palette, Sun, Moon, Monitor, Check, Pipette } from 'lucide-react';
import { useTheme, type Accent, type Mode, type SidebarStyle, type WaveStyle, FONTS, ensureFont, deriveAccentVars } from '@/shared/contexts/ThemeContext';
import { SidebarWaves } from './SidebarWaves';

const PRESETS: { key: Accent; label: string; from: string; to: string; mid: string }[] = [
  { key: 'maroon',  label: 'Maroon',  from: '#4a0811', mid: '#7b0d1e', to: '#a01428' },
  { key: 'purple',  label: 'Purple',  from: '#7c2d8e', mid: '#9333ea', to: '#c0547a' },
  { key: 'blue',    label: 'Blue',    from: '#1e3a8a', mid: '#2563eb', to: '#3b82f6' },
  { key: 'emerald', label: 'Green',   from: '#064e3b', mid: '#059669', to: '#10b981' },
  { key: 'rose',    label: 'Rose',    from: '#9f1239', mid: '#e11d48', to: '#f43f5e' },
  { key: 'amber',   label: 'Amber',   from: '#78350f', mid: '#d97706', to: '#fbbf24' },
  { key: 'forest',     label: 'Forest',     from: '#16352b', mid: '#2f6d57', to: '#4f8c73' },
  { key: 'ocean',      label: 'Ocean',      from: '#173a5d', mid: '#2f6fae', to: '#4a8cc7' },
  { key: 'plum',       label: 'Plum',       from: '#3d2a59', mid: '#7652a8', to: '#9270c2' },
  { key: 'terracotta', label: 'Terracotta', from: '#612b1c', mid: '#b95434', to: '#d06c4b' },
  { key: 'graphite',   label: 'Graphite',   from: '#18181b', mid: '#3f3f46', to: '#71717a' },
  { key: 'indigo',  label: 'Indigo',  from: '#312e81', mid: '#4f46e5', to: '#6366f1' },
];

const MODES: { key: Mode; label: string; Icon: React.ComponentType<{ size: number }> }[] = [
  { key: 'light',  label: 'Light',  Icon: Sun     },
  { key: 'dark',   label: 'Dark',   Icon: Moon    },
  { key: 'system', label: 'Auto',   Icon: Monitor },
];

// Page-background choices. '' = follow the active theme's default (maroon = sandal, others = cool grey).
const BG_PRESETS: { key: string; label: string; color: string }[] = [
  { key: '',        label: 'Default', color: '#f3f4f6' },
  { key: 'tinted',  label: 'Tinted',  color: 'color-mix(in srgb, var(--accent-600) 10%, #f7f7f5)' },
  { key: '#f4f1ec', label: 'Sandal',  color: '#f4f1ec' },
  { key: '#faf8f5', label: 'Cream',   color: '#faf8f5' },
  { key: '#f1f5f9', label: 'Cool',    color: '#f1f5f9' },
  { key: '#f5f5f4', label: 'Stone',   color: '#f5f5f4' },
  { key: '#ffffff', label: 'White',   color: '#ffffff' },
];

export default function ThemePicker() {
  const { accent, mode, customColor, bg, font, sidebar, wave, setAccent, setMode, setCustomColor, setBg, setFont, setSidebar, setWave } = useTheme();
  const [open, setOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);

  const bgIsCustom = !!bg && !BG_PRESETS.some(p => p.key === bg);

  // Live-preview custom color while the native picker is open
  const handleColorChange = (hex: string) => {
    setCustomColor(hex);
    setAccent('custom');
    // Apply vars immediately for live preview
    const vars = deriveAccentVars(hex);
    Object.entries(vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v));
  };

  const activePreset = PRESETS.find(p => p.key === accent);
  const customGradient = (() => {
    const vars = deriveAccentVars(customColor);
    return `linear-gradient(135deg, ${vars['--sidebar-from']}, ${vars['--sidebar-via']}, ${vars['--sidebar-to']})`;
  })();

  const triggerGradient = accent === 'custom'
    ? customGradient
    : activePreset
      ? `linear-gradient(135deg, ${activePreset.from}, ${activePreset.mid}, ${activePreset.to})`
      : 'linear-gradient(135deg, #7c2d8e, #9b3ba4, #c0547a)';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Change theme"
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 hover:shadow-md flex-shrink-0"
        style={{
          background: triggerGradient,
          boxShadow:  open
            ? '0 0 0 2px var(--accent-50), 0 0 0 3.5px var(--accent-600)'
            : '0 0 0 2px var(--accent-50), 0 0 0 3px color-mix(in srgb, var(--accent-600) 35%, transparent)',
        }}
      >
        <Palette size={13} className="text-white drop-shadow-sm" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50">

            {/* Header preview strip */}
            <div
              className="h-16 w-full flex items-center justify-center relative"
              style={{
                background: accent === 'custom'
                  ? customGradient
                  : activePreset
                    ? `linear-gradient(135deg, ${activePreset.from}, ${activePreset.mid}, ${activePreset.to})`
                    : 'linear-gradient(135deg, #7c2d8e, #9b3ba4, #c0547a)',
              }}
            >
              <span className="text-white text-sm font-semibold tracking-wide drop-shadow">
                {accent === 'custom' ? 'Custom' : activePreset?.label ?? ''} Theme
              </span>
            </div>

            <div className="p-4 space-y-4">

              {/* ── Mode ── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Mode</p>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700/60">
                  {MODES.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
                        ${mode === key
                          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Preset swatches ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Theme Colour
                </p>
                <div className="grid grid-cols-6 gap-y-3 gap-x-1">
                  {PRESETS.map(a => {
                    const isActive = accent === a.key;
                    return (
                      <button key={a.key} onClick={() => setAccent(a.key)} title={a.label} className="group flex flex-col items-center gap-1">
                        <span
                          style={{
                            background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
                            outline: isActive ? `2.5px solid ${a.mid}` : '2.5px solid transparent',
                            outlineOffset: '2px',
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-150 group-hover:scale-110 shadow-sm"
                        >
                          {isActive && <Check size={15} className="text-white drop-shadow" strokeWidth={3} />}
                        </span>
                        <span className={`text-[10px] leading-tight truncate max-w-full ${isActive ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {a.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Custom color ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Custom Color
                </p>

                <div className="flex items-center gap-3">
                  {/* Color swatch — clicking opens the native picker */}
                  <button
                    onClick={() => colorInputRef.current?.click()}
                    title="Pick custom color"
                    style={{
                      background: customGradient,
                      outline: accent === 'custom' ? `2.5px solid ${customColor}` : '2.5px solid transparent',
                      outlineOffset: '2px',
                    }}
                    className="relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all hover:scale-105 hover:shadow-md"
                  >
                    <Pipette size={13} className="text-white drop-shadow" />
                    {accent === 'custom' && (
                      <Check size={10} className="absolute top-0.5 right-0.5 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </button>

                  {/* Hex input */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10"
                        style={{ backgroundColor: customColor }}
                      />
                      <input
                        type="text"
                        value={customColor}
                        maxLength={7}
                        onChange={e => {
                          const v = e.target.value;
                          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                            if (v.length === 7) handleColorChange(v);
                            else setCustomColor(v);
                          }
                        }}
                        onBlur={() => {
                          if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                            setAccent('custom');
                          }
                        }}
                        className="flex-1 text-sm font-mono bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-0"
                        placeholder="#000000"
                        spellCheck={false}
                      />
                      <button
                        onClick={() => colorInputRef.current?.click()}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <Pipette size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Hidden native color input */}
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={customColor}
                    onChange={e => handleColorChange(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>

                {/* Quick palette swatches */}
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {[
                    '#ef4444','#f97316','#eab308','#22c55e',
                    '#14b8a6','#06b6d4','#8b5cf6','#ec4899',
                    '#64748b','#0ea5e9','#a855f7','#f43f5e',
                  ].map(c => (
                    <button
                      key={c}
                      onClick={() => handleColorChange(c)}
                      title={c}
                      style={{
                        backgroundColor: c,
                        outline: accent === 'custom' && customColor === c ? `2px solid ${c}` : '2px solid transparent',
                        outlineOffset: '1.5px',
                      }}
                      className="w-5 h-5 rounded-full transition-all hover:scale-125 hover:shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* ── Font ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Font</p>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map(f => {
                    const active = font === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFont(f.id)}
                        onMouseEnter={() => ensureFont(f.id)}
                        onFocus={() => ensureFont(f.id)}
                        style={{ outline: active ? '2px solid var(--accent-600)' : '2px solid transparent', outlineOffset: '1px' }}
                        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-600 px-2.5 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100" style={{ fontFamily: `${f.family}, sans-serif` }}>Aa</span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{f.label}</span>
                          <span className="block text-[10px] text-gray-400 dark:text-gray-500 truncate">{f.note}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Navigation style ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Navigation Style</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'light',    label: 'Light',    bar: '#e9e8e4', ink: 'rgba(0,0,0,0.25)' },
                    { id: 'dark',     label: 'Dark',     bar: 'linear-gradient(180deg,#17181b,#09090b)', ink: 'rgba(255,255,255,0.35)' },
                    { id: 'gradient', label: 'Gradient', bar: 'linear-gradient(to bottom,var(--sidebar-from),var(--sidebar-via),var(--sidebar-to))', ink: 'rgba(255,255,255,0.4)' },
                  ] as { id: SidebarStyle; label: string; bar: string; ink: string }[]).map(o => {
                    const active = sidebar === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSidebar(o.id)}
                        style={{ outline: active ? '2px solid var(--accent-600)' : '2px solid transparent', outlineOffset: '1px' }}
                        className="rounded-xl border border-gray-200 dark:border-gray-600 p-1.5 transition hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="flex h-14 overflow-hidden rounded-lg" style={{ background: o.bar }}>
                          <span className="flex w-1/3 flex-col gap-1 p-1.5">
                            {[0, 1, 2].map(i => <span key={i} className="h-1 rounded-full" style={{ background: o.ink }} />)}
                          </span>
                          <span className="m-1 flex-1 rounded-md bg-white" />
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Navigation effect ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Navigation Effect</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'none', label: 'None' }, { id: 'flow', label: 'Flow' }, { id: 'ribbon', label: 'Ribbon' },
                    { id: 'aurora', label: 'Aurora' }, { id: 'dots', label: 'Dots' }, { id: 'topo', label: 'Topo' },
                  ] as { id: WaveStyle; label: string }[]).map(o => {
                    const active = wave === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setWave(o.id)}
                        style={{ outline: active ? '2px solid var(--accent-600)' : '2px solid transparent', outlineOffset: '1px' }}
                        className="rounded-xl border border-gray-200 dark:border-gray-600 p-1.5 transition hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span
                          className="relative block h-12 overflow-hidden rounded-lg"
                          style={{ background: 'linear-gradient(to bottom,var(--sidebar-from),var(--sidebar-via),var(--sidebar-to))', color: '#fff' }}
                        >
                          {o.id !== 'none' && <SidebarWaves style={o.id} />}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Page background ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Content Background
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {BG_PRESETS.map(b => {
                    const isActive = bg === b.key;
                    return (
                      <button key={b.key || 'default'} onClick={() => setBg(b.key)} title={b.label} className="group flex flex-col items-center gap-1">
                        {/* A small page in that colour: a header pill and a content card, like the app's screens */}
                        <span
                          style={{
                            background: b.color,
                            outline: isActive ? '2px solid var(--accent-600)' : '2px solid transparent',
                            outlineOffset: '1px',
                          }}
                          className="relative w-full h-14 rounded-xl border border-gray-200 dark:border-gray-600 p-2 flex gap-1.5 transition-transform group-hover:scale-[1.03]"
                        >
                          <span className="w-2/5 h-3 rounded-full bg-white/90 border border-black/[0.06]" />
                          <span className="flex-1 rounded-md bg-white border border-black/[0.06]" />
                          {isActive && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-600)' }}>
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className={`text-[11px] ${isActive ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{b.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom background color — same UX as the theme custom color */}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => bgColorInputRef.current?.click()}
                    title="Pick custom background"
                    style={{
                      background: bgIsCustom ? bg : '#f4f1ec',
                      outline: bgIsCustom ? '2.5px solid var(--accent-600)' : '2.5px solid transparent',
                      outlineOffset: '2px',
                    }}
                    className="relative w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-600 transition-all hover:scale-105"
                  >
                    <Pipette size={13} className="text-gray-600 dark:text-gray-700 drop-shadow" />
                    {bgIsCustom && (
                      <Check size={10} className="absolute top-0.5 right-0.5 text-gray-700 drop-shadow" strokeWidth={3} />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10"
                        style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(bg) ? bg : '#f4f1ec' }}
                      />
                      <input
                        type="text"
                        value={bg}
                        maxLength={7}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v)) setBg(v);
                        }}
                        className="flex-1 text-sm font-mono bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-0"
                        placeholder="#F4F1EC"
                        spellCheck={false}
                      />
                      <button
                        onClick={() => bgColorInputRef.current?.click()}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <Pipette size={13} />
                      </button>
                    </div>
                  </div>

                  <input
                    ref={bgColorInputRef}
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(bg) ? bg : '#f4f1ec'}
                    onChange={e => setBg(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>

                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  Default follows the theme. Applies in light mode.
                </p>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
