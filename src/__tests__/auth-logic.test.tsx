import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../components/auth-provider';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseLib from '../lib/firebase';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null },
}));

// Mock Firebase Auth functions
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    signInAnonymously: vi.fn(),
    signInWithPopup: vi.fn(),
    linkWithPopup: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
      // Simulate auth state change immediately
      callback(null);
      return () => {};
    }),
    GoogleAuthProvider: class {},
  };
});

// Mock lib/firebase
vi.mock('../lib/firebase', () => ({
  auth: mocks.auth,
  db: {},
  googleProvider: {},
}));

// Mock lib/user
vi.mock('../lib/user', () => ({
  getOrCreateUserProfile: vi.fn().mockResolvedValue({ id: 'test-uid', isAnonymous: true }),
}));

describe('Auth Logic (Hybrid)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = null;
  });

  it('should provide signInWithGoogle function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    // @ts-expect-error - Function not yet implemented
    expect(result.current.signInWithGoogle).toBeDefined();
    // @ts-expect-error
    expect(typeof result.current.signInWithGoogle).toBe('function');
  });

  it('should provide linkGoogleAccount function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    // @ts-expect-error - Function not yet implemented
    expect(result.current.linkGoogleAccount).toBeDefined();
    // @ts-expect-error
    expect(typeof result.current.linkGoogleAccount).toBe('function');
  });

  it('should call signInWithPopup when signInWithGoogle is called', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    // @ts-expect-error
    if (result.current.signInWithGoogle) {
        // @ts-expect-error
        await act(async () => { await result.current.signInWithGoogle(); });
        expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
    }
  });

  it('should call linkWithPopup when linkGoogleAccount is called', async () => {
    // Set currentUser for this test
    // @ts-expect-error
    mocks.auth.currentUser = { uid: 'test-uid' };

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    // @ts-expect-error
    if (result.current.linkGoogleAccount) {
        // @ts-expect-error
        await act(async () => { await result.current.linkGoogleAccount(); });
        expect(firebaseAuth.linkWithPopup).toHaveBeenCalled();
    }
  });

  it('should throw error when signInWithGoogle fails', async () => {
    const error = new Error('Sign-in failed');
    // @ts-expect-error
    firebaseAuth.signInWithPopup.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    // @ts-expect-error
    if (result.current.signInWithGoogle) {
      await expect(act(async () => { 
        // @ts-expect-error
        await result.current.signInWithGoogle(); 
      })).rejects.toThrow('Sign-in failed');
    }
  });

  it('should throw error when linkGoogleAccount fails', async () => {
    // Set currentUser
    // @ts-expect-error
    mocks.auth.currentUser = { uid: 'test-uid' };

    const error = new Error('Linking failed');
    // @ts-expect-error
    firebaseAuth.linkWithPopup.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    // @ts-expect-error
    if (result.current.linkGoogleAccount) {
      await expect(act(async () => { 
        // @ts-expect-error
        await result.current.linkGoogleAccount(); 
      })).rejects.toThrow('Linking failed');
    }
  });
});
