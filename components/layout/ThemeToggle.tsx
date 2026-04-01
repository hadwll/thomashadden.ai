'use client';

import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} mode`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-secondary transition-colors duration-normal hover:text-text-primary"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {theme === 'dark' ? '☾' : '☀'}
      </span>
    </button>
  );
}
