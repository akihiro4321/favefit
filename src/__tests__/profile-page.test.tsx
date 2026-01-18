import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock imports BEFORE importing the component
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock the AuthProvider to simulate different auth states
vi.mock('../components/auth-provider', async () => {
  const actual = await vi.importActual('../components/auth-provider');
  return {
    ...actual,
    useAuth: vi.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

import ProfilePage from '../app/profile/page';
import { useAuth } from '../components/auth-provider';

describe('Profile Page', () => {
  it('renders loading state initially', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      signInWithGoogle: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    render(<ProfilePage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders guest profile correctly', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'guest-123', isAnonymous: true },
      profile: { id: 'guest-123', isAnonymous: true },
      loading: false,
      signInWithGoogle: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    render(<ProfilePage />);
    expect(screen.getByText(/guest user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument(); // Link button
  });

  it('renders linked user profile correctly', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123', isAnonymous: false, displayName: 'Test User', email: 'test@example.com' },
      profile: { id: 'user-123', isAnonymous: false },
      loading: false,
      signInWithGoogle: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    render(<ProfilePage />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /link google/i })).not.toBeInTheDocument();
  });
});
