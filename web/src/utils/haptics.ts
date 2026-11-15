import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Safely trigger haptic feedback on supported native platforms (Android / iOS).
 * Degrades gracefully with a silent no-op on the web.
 */
export async function hapticTick(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Graceful fallback on web / unsupported devices
  }
}

export async function hapticSelection(): Promise<void> {
  try {
    await Haptics.selectionChanged();
  } catch {
    // Graceful fallback
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Graceful fallback
  }
}

export async function hapticError(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    // Graceful fallback
  }
}
