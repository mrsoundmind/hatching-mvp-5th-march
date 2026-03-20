import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('ThemeProvider', () => {
  it('ThemeProvider.tsx exists and exports ThemeProvider component', () => {
    const src = read('client/src/components/ThemeProvider.tsx');
    expect(src).toContain('export function ThemeProvider');
  });

  it('ThemeProvider.tsx exports useTheme hook', () => {
    const src = read('client/src/components/ThemeProvider.tsx');
    expect(src).toContain('export function useTheme');
  });

  it('ThemeProvider reads from localStorage key hatchin-theme', () => {
    const src = read('client/src/components/ThemeProvider.tsx');
    expect(src).toContain('hatchin-theme');
  });

  it('ThemeProvider applies dark class to document root', () => {
    const src = read('client/src/components/ThemeProvider.tsx');
    expect(src).toContain('classList.add("dark")');
    expect(src).toContain('classList.remove("dark")');
  });

  it('ThemeProvider listens for prefers-color-scheme media query changes', () => {
    const src = read('client/src/components/ThemeProvider.tsx');
    expect(src).toContain('prefers-color-scheme');
    expect(src).toContain('addEventListener');
  });
});

describe('ThemeToggle', () => {
  it('ThemeToggle.tsx exists and exports ThemeToggle component', () => {
    const src = read('client/src/components/ThemeToggle.tsx');
    expect(src).toContain('export function ThemeToggle');
  });

  it('ThemeToggle imports useTheme and uses Sun/Moon icons', () => {
    const src = read('client/src/components/ThemeToggle.tsx');
    expect(src).toContain('useTheme');
    expect(src).toContain('Sun');
    expect(src).toContain('Moon');
    expect(src).toContain('lucide-react');
  });

  it('ThemeToggle calls toggleTheme on click and has aria-label', () => {
    const src = read('client/src/components/ThemeToggle.tsx');
    expect(src).toContain('toggleTheme');
    expect(src).toContain('onClick');
    expect(src).toContain('aria-label');
  });
});

describe('App.tsx integration', () => {
  it('App.tsx imports ThemeProvider', () => {
    const src = read('client/src/App.tsx');
    expect(src).toContain('ThemeProvider');
    expect(src).toContain('@/components/ThemeProvider');
  });

  it('App.tsx wraps content with ThemeProvider inside QueryClientProvider', () => {
    const src = read('client/src/App.tsx');
    const qcpIdx = src.indexOf('<QueryClientProvider');
    const tpIdx = src.indexOf('<ThemeProvider');
    expect(tpIdx).toBeGreaterThan(qcpIdx);
    expect(tpIdx).not.toBe(-1);
  });

  it('App.tsx does not use hardcoded bg-[#0A0A0A] in loading screens', () => {
    const src = read('client/src/App.tsx');
    expect(src).not.toContain('bg-[#0A0A0A]');
  });

  it('App.tsx uses text-foreground instead of text-white for loading branding', () => {
    const src = read('client/src/App.tsx');
    expect(src).toContain('text-foreground');
  });
});

describe('LeftSidebar.tsx integration', () => {
  it('LeftSidebar imports ThemeToggle', () => {
    const src = read('client/src/components/LeftSidebar.tsx');
    expect(src).toContain('ThemeToggle');
    expect(src).toContain('./ThemeToggle');
  });

  it('ThemeToggle appears before the Sign Out separator in dropdown', () => {
    const src = read('client/src/components/LeftSidebar.tsx');
    const themeToggleIdx = src.indexOf('<ThemeToggle');
    const signOutIdx = src.indexOf('Sign Out');
    expect(themeToggleIdx).not.toBe(-1);
    expect(themeToggleIdx).toBeLessThan(signOutIdx);
  });
});

describe('ThemeToggle styling', () => {
  it('ThemeToggle has conditional icon rendering and text labels', () => {
    const src = read('client/src/components/ThemeToggle.tsx');
    expect(src).toContain('Light Mode');
    expect(src).toContain('Dark Mode');
    expect(src).toContain('w-4 h-4');
    expect(src).toContain('hatchin-text');
  });
});
