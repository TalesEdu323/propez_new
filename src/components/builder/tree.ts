import type { BuilderElement } from '../../types/builder';

/**
 * Operações puras sobre a árvore do Builder.
 *
 * Todas as funções recebem o estado atual e retornam um novo array,
 * sem mutação, permitindo uso fora do componente (ex.: testes, undo/redo).
 */

export function addElementToParent(
  items: BuilderElement[],
  parentId: string,
  newEl: BuilderElement,
): BuilderElement[] {
  return items.map(item => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children || []), newEl] };
    }
    if (item.children) {
      return { ...item, children: addElementToParent(item.children, parentId, newEl) };
    }
    return item;
  });
}

export function updateElementRecursive(
  items: BuilderElement[],
  id: string,
  newProps: Record<string, unknown>,
  onMatch?: (updated: BuilderElement, original: BuilderElement, props: Record<string, unknown>) => BuilderElement,
): BuilderElement[] {
  return items.map(item => {
    if (item.id === id) {
      const merged: BuilderElement = { ...item, props: { ...item.props, ...newProps } };
      return onMatch ? onMatch(merged, item, newProps) : merged;
    }
    if (item.children) {
      return { ...item, children: updateElementRecursive(item.children, id, newProps, onMatch) };
    }
    return item;
  });
}

export function deleteElementRecursive(items: BuilderElement[], id: string): BuilderElement[] {
  return items
    .filter(item => item.id !== id)
    .map(item => item.children
      ? { ...item, children: deleteElementRecursive(item.children, id) }
      : item);
}

export function moveElementRecursive(
  items: BuilderElement[],
  id: string,
  direction: 'up' | 'down',
): BuilderElement[] {
  const index = items.findIndex(el => el.id === id);
  if (index !== -1) {
    const next = [...items];
    if (direction === 'up' && index > 0) {
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
    } else if (direction === 'down' && index < next.length - 1) {
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
    }
    return next;
  }
  return items.map(item => item.children
    ? { ...item, children: moveElementRecursive(item.children, id, direction) }
    : item);
}

export function findElementRecursive(items: BuilderElement[], id: string): BuilderElement | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findElementRecursive(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
