/**
 * Zustand store for ephemeral UI state
 */
import { create } from 'zustand';

interface AppState {
  // Location sharing
  isSharingLocation: boolean;
  setIsSharingLocation: (sharing: boolean) => void;

  // Current user location
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;

  // Throw cooldown
  lastThrowTime: number | null;
  setLastThrowTime: (time: number | null) => void;
  canThrow: () => boolean;

  // UI state
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;

  // Directional buzzer state
  isBuzzerEnabled: boolean;
  setIsBuzzerEnabled: (enabled: boolean) => void;
  buzzerTargetUserId: string | null;
  setBuzzerTargetUserId: (userId: string | null) => void;
}

const THROW_COOLDOWN_MS = 10000; // 10 seconds

export const useAppStore = create<AppState>((set, get) => ({
  isSharingLocation: false,
  setIsSharingLocation: (sharing) => set({ isSharingLocation: sharing }),

  currentLocation: null,
  setCurrentLocation: (location) => set({ currentLocation: location }),

  lastThrowTime: null,
  setLastThrowTime: (time) => set({ lastThrowTime: time }),
  canThrow: () => {
    const { lastThrowTime } = get();
    if (!lastThrowTime) return true;
    return Date.now() - lastThrowTime > THROW_COOLDOWN_MS;
  },

  selectedUserId: null,
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),

  isBuzzerEnabled: false,
  setIsBuzzerEnabled: (enabled) => set({ isBuzzerEnabled: enabled }),
  buzzerTargetUserId: null,
  setBuzzerTargetUserId: (userId) => set({ buzzerTargetUserId: userId }),
}));
