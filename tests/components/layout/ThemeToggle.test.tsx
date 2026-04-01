import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ThemeProvider } from '@/lib/theme';

function mockMatchMedia(prefersLight: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: light)' ? prefersLight : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMedia
  });

  return matchMedia;
}

function renderThemeToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    mockMatchMedia(false);
  });

  it('reads an existing theme preference from localStorage when present', async () => {
    window.localStorage.setItem('theme', 'light');

    renderThemeToggle();

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark');
    });

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it('falls back to prefers-color-scheme when no stored preference exists', async () => {
    const matchMedia = mockMatchMedia(true);

    renderThemeToggle();

    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark');
    });
  });

  it('toggles the dark class on html and persists the new theme value', async () => {
    window.localStorage.setItem('theme', 'dark');
    const user = userEvent.setup();

    renderThemeToggle();

    const toggle = await screen.findByRole('button', { name: /switch to light mode/i });

    await user.click(toggle);

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark');
    });

    expect(window.localStorage.getItem('theme')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });
});
