/**
 * Whether the boot log still has to play this session. It lives apart from
 * BootScreen so the skin switcher can ask without importing a component — and
 * so that file keeps exporting only its component, which is what lets Vite hot
 * reload it without a full refresh.
 */
export function bootPending() {
  if (new URLSearchParams(location.search).get('boot') === 'off') return false
  try {
    return sessionStorage.getItem('booted') !== '1'
  } catch {
    return true
  }
}
