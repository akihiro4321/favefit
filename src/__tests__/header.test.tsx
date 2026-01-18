import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/header';

// Mock AuthProvider
vi.mock('../components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock usePathname
const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathname,
}));

import { useAuth } from '../components/auth-provider';

describe('Header Component', () => {
  it('does not render on root path "/"', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: true },
      loading: false,
      signInGuest: vi.fn(),
    });
    mocks.usePathname.mockReturnValue('/');

    const { container } = render(<Header />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "ゲスト" for anonymous users on other paths', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: true },
      loading: false,
      signInGuest: vi.fn(),
    });
    mocks.usePathname.mockReturnValue('/home');

    render(<Header />);
    expect(screen.getByText('ゲスト')).toBeInTheDocument();
  });

  it('renders display name for linked users', () => {
    // @ts-expect-error
    vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: false, displayName: 'Test User' },
      loading: false,
      signInGuest: vi.fn(),
    });
    mocks.usePathname.mockReturnValue('/home');

    render(<Header />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByText('ゲスト')).not.toBeInTheDocument();
  });

  it('contains a link to the profile page', () => {
     // @ts-expect-error
     vi.mocked(useAuth).mockReturnValue({
      user: { isAnonymous: true },
      loading: false,
      signInGuest: vi.fn(),
    });
    mocks.usePathname.mockReturnValue('/home');

    render(<Header />);
    const link = screen.getByRole('link', { name: /ゲスト/i });
    expect(link).toHaveAttribute('href', '/profile');
  });
});

