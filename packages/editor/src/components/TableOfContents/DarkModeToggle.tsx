import { HugeiconsIcon } from '@hugeicons/react';
import { Moon02Icon, Sun01Icon } from '@hugeicons/core-free-icons';
import { useThemeStore } from '../../stores/themeStore';

export function DarkModeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="dark-mode-toggle"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <HugeiconsIcon icon={Moon02Icon} size={16} />
      ) : (
        <HugeiconsIcon icon={Sun01Icon} size={16} />
      )}
    </button>
  );
}
