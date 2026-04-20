import { useEffect, useState } from 'react';
import type { BuilderElement } from '../../types/builder';

const STORAGE_KEY = 'taggo_builder_data';

export interface UseBuilderPersistenceOptions {
  initialElements?: BuilderElement[];
  storageKey?: string;
  onChange?: (elements: BuilderElement[]) => void;
  /**
   * Quando true (default), persiste automaticamente o estado em localStorage.
   * Desative se o consumidor quiser controlar a persistência externamente.
   */
  persist?: boolean;
}

/**
 * Hook que encapsula o estado dos elementos do Builder junto com a persistência
 * automática em localStorage e a notificação via `onChange`. Mantém exatamente
 * o mesmo comportamento que estava inline no Builder.tsx original.
 */
export function useBuilderPersistence({
  initialElements,
  storageKey = STORAGE_KEY,
  onChange,
  persist = true,
}: UseBuilderPersistenceOptions = {}) {
  const [elements, setElements] = useState<BuilderElement[]>(() => {
    if (initialElements !== undefined) return initialElements;
    if (!persist) return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as BuilderElement[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (persist) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(elements));
      } catch {
        // localStorage pode falhar em modo privado ou quota excedida;
        // ignoramos silenciosamente para não quebrar a UI.
      }
    }
    if (onChange) onChange(elements);
  }, [elements, onChange, persist, storageKey]);

  return [elements, setElements] as const;
}
