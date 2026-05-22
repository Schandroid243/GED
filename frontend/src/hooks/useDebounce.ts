import { useState, useEffect } from 'react';

/**
 * Retarde la mise à jour d'une valeur jusqu'à ce que
 * l'appelant ait cessé de changer la valeur pendant `delay` ms.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
