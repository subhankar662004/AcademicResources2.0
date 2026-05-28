import { API_URL } from '../config';

/* Convert a URL-safe base64 VAPID public key to Uint8Array */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/* Register / retrieve the service worker — always resolves to the active reg or null */
export async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    // Register (or get existing) SW — scope '/' is the correct scope argument
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    // If a new SW is installing/waiting, wait for it to activate
    if (reg.installing || reg.waiting) {
      await new Promise((resolve) => {
        const sw = reg.installing || reg.waiting;
        sw.addEventListener('statechange', function handler() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', handler);
            resolve();
          }
        });
        // Safety timeout — don't hang forever
        setTimeout(resolve, 5000);
      });
    }

    // navigator.serviceWorker.ready resolves once an active SW controls the page
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.error('[Push] Service worker registration failed:', err);
    return null;
  }
}

/* Call this at app startup to make sure the SW is always registered */
export async function initServiceWorker() {
  try {
    await ensureServiceWorker();
  } catch {
    // Non-fatal — app works without push
  }
}

export const subscribeToPush = async (token) => {
  try {
    const reg = await ensureServiceWorker();
    if (!reg) {
      console.warn('[Push] Service worker not available');
      return false;
    }

    // Fetch the VAPID public key from the backend
    const res = await fetch(`${API_URL}/api/push/vapid-public-key`);
    if (!res.ok) throw new Error(`Could not fetch VAPID key (${res.status})`);
    const { publicKey } = await res.json();
    if (!publicKey) throw new Error('No VAPID public key returned from server');

    // Unsubscribe any stale subscription first (key rotation safety)
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      try { await existing.unsubscribe(); } catch { /* ignore */ }
    }

    // Create a fresh subscription
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Save to backend
    const saveRes = await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription }),
    });
    if (!saveRes.ok) throw new Error(`Failed to save subscription (${saveRes.status})`);

    console.log('[Push] Subscribed successfully');
    return true;
  } catch (err) {
    console.error('[Push] Subscribe failed:', err);
    return false;
  }
};

export const unsubscribeFromPush = async (token) => {
  try {
    // Use scope '/' — the correct key for getRegistration
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;

    await fetch(`${API_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    console.log('[Push] Unsubscribed');
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
  }
};

/* Check if the user currently has an active push subscription */
export const checkPushSubscription = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    // Use scope '/' — the correct key for getRegistration
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
};
