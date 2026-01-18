import { describe, it, expect, vi } from 'vitest';
import { GoogleAuthProvider } from 'firebase/auth';

// モックの設定をインポートより前に行う
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: class {
    static setCustomParameters = vi.fn();
  },
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
}));

import { auth, googleProvider } from '../lib/firebase';

describe('Firebase Configuration', () => {
  it('should export auth', () => {
    expect(auth).toBeDefined();
  });

  it('should export googleProvider as an instance of GoogleAuthProvider', () => {
    // @ts-expect-error - googleProvider is not yet exported
    expect(googleProvider).toBeDefined();
    // @ts-expect-error
    expect(googleProvider).toBeInstanceOf(GoogleAuthProvider);
  });
});
