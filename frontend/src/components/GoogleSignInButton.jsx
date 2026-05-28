import { useEffect, useRef, useCallback } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Always use the no-port hostname so the redirect URI matches what is registered
// in Google Cloud Console regardless of which port the dev server happens to use.
const _origin = (() => {
  try {
    const u = new URL(window.location.href);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return window.location.origin;
  }
})();
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${_origin}/auth/google/callback.html`;

function GoogleSignInButton({ onCredential, onError, disabled, text = 'continue_with' }) {
  const popupRef    = useRef(null);
  const timerRef    = useRef(null);
  const gotCredRef  = useRef(false);

  const handleMessage = useCallback((event) => {
    // Only check the message type — don't enforce origin because the callback
    // page may be served from a different port than the opener (Replit dev setup).
    if (!event.data || event.data.type !== 'GOOGLE_AUTH') return;
    gotCredRef.current = true;
    const { id_token, error } = event.data;
    if (id_token) onCredential(id_token);
    if (error) {
      console.warn('[Google OAuth] error from popup:', error);
      onError?.('Google sign-in was cancelled or failed. Please try again.');
    }
  }, [onCredential, onError]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(timerRef.current);
    };
  }, [handleMessage]);

  const openPopup = () => {
    if (!CLIENT_ID || disabled) return;

    gotCredRef.current = false;

    const nonce  = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'id_token',
      scope:         'openid email profile',
      nonce,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    const width  = 500;
    const height = 600;
    const left   = window.screenX + (window.outerWidth  - width)  / 2;
    const top    = window.screenY + (window.outerHeight - height) / 2;

    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    popupRef.current = window.open(url, 'google-signin', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(timerRef.current);
        // If popup closed without sending a credential, surface an error
        if (!gotCredRef.current) {
          onError?.('Google sign-in was cancelled. Please try again.');
        }
      }
    }, 500);
  };

  const label = text === 'signup_with' ? 'Sign up with Google' : 'Continue with Google';

  return (
    <button
      type="button"
      className="google-custom-btn"
      onClick={openPopup}
      disabled={disabled || !CLIENT_ID}
      title={!CLIENT_ID ? 'Google Sign-In is not configured yet' : undefined}
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default GoogleSignInButton;
