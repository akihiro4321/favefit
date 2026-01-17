import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RootLayout from '@/app/layout';
import React from 'react';

// Mock fonts and next/font/google
import { Geist, Geist_Mono } from 'next/font/google';

describe('RootLayout', () => {
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
