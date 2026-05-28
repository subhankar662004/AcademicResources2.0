import { useEffect } from 'react';

/**
 * Locks body scroll while the calling component is mounted.
 * Restores scroll on unmount. Safe to stack — uses a counter
 * so multiple simultaneous modals don't fight each other.
 */
let lockCount = 0;

export function useScrollLock() {
  useEffect(() => {
    lockCount++;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = '';
      }
    };
  }, []);
}
