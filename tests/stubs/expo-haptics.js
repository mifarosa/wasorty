// Stands in for expo-haptics in the tests (the real one only runs on a phone).
import { vi } from 'vitest';

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Soft: 'soft',
  Rigid: 'rigid'
};
export const NotificationFeedbackType = { Success: 'success', Warning: 'warning' };
export const impactAsync = vi.fn(() => Promise.resolve());
export const notificationAsync = vi.fn(() => Promise.resolve());
export const selectionAsync = vi.fn(() => Promise.resolve());
