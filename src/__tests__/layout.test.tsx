import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout from '../app/layout';

// Mock imports
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  signInAnonymously: vi.fn(),
  GoogleAuthProvider: class {},
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/home'),
}));

describe('Root Layout', () => {
  it('should render children', () => {
    render(
      <RootLayout>
        <div data-testid="child">Child Content</div>
      </RootLayout>
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('should have a header with the app name', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    expect(screen.getByText(/FaveFit/i)).toBeDefined();
  });

  it('should have a navigation bar', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    // Looking for a nav element or test-id
    expect(screen.getByRole('navigation')).toBeDefined();
  });
});
