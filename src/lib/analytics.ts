// Visit stats come from GoatCounter (cookie-free); see the script in app/layout.tsx. Page views
// are counted by the script itself; this adds the things that happen inside the one page, such
// as opening a window. It does nothing if the script is blocked or hasn't loaded.
declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void };
  }
}

export function track(name: string, title?: string) {
  try {
    window.goatcounter?.count?.({ path: name, title, event: true });
  } catch {
    // analytics must never break the site
  }
}
