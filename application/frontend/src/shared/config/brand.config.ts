/* App branding — one place for the name and logos. Defaults to Symatis; a deployment
   can override the name via VITE_APP_NAME / VITE_APP_TAGLINE without code changes. */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const BRAND = {
  name:    env.VITE_APP_NAME    || 'Symatis',
  tagline: env.VITE_APP_TAGLINE || 'Solutions',
  /** Full wordmark (wide) — login screen. */
  logo:    '/symatis-logo.svg',
  /** Square "S" mark — sidebar tile, favicon. */
  mark:    '/symatis-mark.svg',
} as const;
