/**
 * Vite sets `import.meta.env.DEV` true in development; production builds are false.
 * Use to gate dev-only affordances (simulators, mock labels) without affecting shipped UI.
 */
export const IS_DEV_UI = import.meta.env.DEV;
