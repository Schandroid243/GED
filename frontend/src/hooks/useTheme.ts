import { useTheme as useNextTheme } from 'next-themes';

/** Hook simplifié pour basculer le thème clair/sombre */
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = resolvedTheme === 'dark';

  return {
    theme,
    resolvedTheme,
    isDark,
    toggle,
    setTheme,
  };
}
