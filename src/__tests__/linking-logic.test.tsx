import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../components/auth-provider';
import * as firebaseAuth from 'firebase/auth';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null },
}));

// Mock Firebase Auth
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    signInAnonymously: vi.fn(),
    signInWithPopup: vi.fn(),
    linkWithPopup: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
      callback(mocks.auth.currentUser);
      return () => {};
    }),
    GoogleAuthProvider: class {
      static credentialFromResult = vi.fn(() => ({}));
    },
    signInWithCredential: vi.fn(),
  };
});

// Mock lib/firebase and user
vi.mock('../lib/firebase', () => ({
  auth: mocks.auth,
  db: {},
  googleProvider: {},
}));

vi.mock('../lib/user', () => ({
  getOrCreateUserProfile: vi.fn().mockResolvedValue({ id: 'test-uid', isAnonymous: true }),
}));

describe('Account Linking Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = null;
  });

  it('should handle "credential-already-in-use" error during linking', async () => {
    // Simulate logged-in anonymous user
    // @ts-expect-error
    mocks.auth.currentUser = { uid: 'anon-uid', isAnonymous: true };
    
    // Mock linkWithPopup to throw "credential-already-in-use" error
    const error: any = new Error('Credential already in use');
    error.code = 'auth/credential-already-in-use';
    error.credential = { providerId: 'google.com' };
    // @ts-expect-error
    firebaseAuth.linkWithPopup.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    // Expect the function to throw, or handle it gracefully if that's the design.
    // In this plan, we want to handle it. For now, let's verify it propagates the specific error code
    // so the UI can handle it, or we can handle it inside and return a specific result.
    // Let's assume we want to catch it and re-throw or return a status.
    // The current implementation re-throws.
    
    // @ts-expect-error
    await expect(act(async () => {
      // @ts-expect-error
      await result.current.linkGoogleAccount();
    })).rejects.toHaveProperty('code', 'auth/credential-already-in-use');
  });
});
