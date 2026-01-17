import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have the correct project name in package.json', async () => {
    const pkg = await import('../../package.json');
    expect(pkg.name).toBe('favefit');
  });

  it('should have next as a dependency', async () => {
    const pkg = await import('../../package.json');
    expect(pkg.dependencies.next).toBeDefined();
  });

  it('should have the correct primary color in globals.css', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const globalsCss = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf-8');
    expect(globalsCss).toContain('--primary: oklch(0.82 0.18 161.4)');
    expect(globalsCss).toContain('--secondary: oklch(0.73 0.18 45.4)');
  });
});
