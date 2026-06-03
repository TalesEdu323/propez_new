import { useEffect, useState } from 'react';
import type { BuilderElement } from '../../types/builder';

export interface UseBuilderPersistenceOptions {
  initialElements?: BuilderElement[];
  onChange?: (elements: BuilderElement[]) => void;
}

/**
 * Estado dos elementos do Builder — persistência apenas via API do modelo/proposta (MVP).
 */
export function useBuilderPersistence({
  initialElements,
  onChange,
}: UseBuilderPersistenceOptions = {}) {
  const [elements, setElements] = useState<BuilderElement[]>(() => initialElements ?? []);

  useEffect(() => {
    if (initialElements !== undefined) {
      setElements(initialElements);
    }
  }, [initialElements]);

  useEffect(() => {
    onChange?.(elements);
  }, [elements, onChange]);

  return [elements, setElements] as const;
}
