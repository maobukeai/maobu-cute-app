// Tactile Haptics Engine for 【猫步可爱】
// Supports Web Vibration API with safe fallbacks and customizable intensity

class HapticsManager {
  public isEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('maobu_haptics_enabled');
      if (stored !== null) {
        this.isEnabled = stored === 'true';
      }
    } catch {
      this.isEnabled = true;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('maobu_haptics_enabled', String(enabled));
    } catch {
      // ignore
    }
  }

  private vibrate(pattern: number | number[]) {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore Vibration API security / user gesture restrictions
    }
  }

  // Light tactile click (navigation tabs, toggles, keyboard input)
  public selection() {
    this.vibrate(8);
  }

  // Soft subtle impact (opening menus, selecting pills)
  public impactLight() {
    this.vibrate(12);
  }

  // Medium impact (confirming actions, opening modals)
  public impactMedium() {
    this.vibrate(22);
  }

  // Strong impact (important actions, deletions)
  public impactHeavy() {
    this.vibrate(36);
  }

  // Success celebration pattern (task done, unlock vault, backup saved)
  public notificationSuccess() {
    this.vibrate([15, 50, 25]);
  }

  // Warning feedback (form validation, duplicate item)
  public notificationWarning() {
    this.vibrate([25, 60, 25]);
  }

  // Error buzz (wrong password, network failure)
  public notificationError() {
    this.vibrate([35, 50, 35, 50, 40]);
  }
}

export const haptics = new HapticsManager();
