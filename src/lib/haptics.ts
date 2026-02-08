/**
 * Haptic feedback utilities for mobile devices
 * Uses Vibration API (supported on Android, limited on iOS Safari)
 */

export const haptic = {
  /** Light tap - nav items, tab switches */
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  
  /** Medium feedback - start/stop recording, confirmations */
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
  },
  
  /** Strong feedback - task complete, save actions */
  strong: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  },
  
  /** Success pattern - achievements, bamboo level up */
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
  },
  
  /** Error pattern - validation errors */
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  },
};

export default haptic;
