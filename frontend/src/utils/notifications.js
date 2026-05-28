export const NOTIF_KEY = 'acadhub_notifications';
export const TTL_MS   = 24 * 60 * 60 * 1000;

export function loadNotifications() {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    const now = Date.now();
    return stored.filter(n => !n.readAt || (now - n.readAt) < TTL_MS);
  } catch { return []; }
}

export function saveNotifications(list) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, 50)));
    window.dispatchEvent(new CustomEvent('notif-updated'));
  } catch {}
}

export function formatAge(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
