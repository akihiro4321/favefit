import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/header';

// Mock AuthProvider
vi.mock('../components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../components/auth-provider';

describe('Header Component', () => {
  it('renders "ゲスト" for anonymous users', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: true },
      loading: false,
    });

    render(<Header />);
    expect(screen.getByText('ゲスト')).toBeInTheDocument();
  });

  it('renders display name for linked users', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: false, displayName: 'Test User' },
      loading: false,
    });

    render(<Header />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByText('ゲスト')).not.toBeInTheDocument();
  });

  it('contains a link to the profile page', () => {
     // @ts-expect-error
     vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: true },
      loading: false,
    });

    render(<Header />);
    const link = screen.getByRole('link', { name: /ゲスト/i });
    expect(link).toHaveAttribute('href', '/profile');
  });
});
