import { describe, it, expect } from 'vitest';
import {
  addElementToParent,
  updateElementRecursive,
  deleteElementRecursive,
  moveElementRecursive,
  findElementRecursive,
} from '../tree';
import type { BuilderElement } from '../../../types/builder';

const makeTree = (): BuilderElement[] => [
  {
    id: 'container-1',
    type: 'container',
    props: { padding: 8 },
    children: [
      {
        id: 'heading-1',
        type: 'heading',
        props: { text: 'A' },
      },
      {
        id: 'grid-1',
        type: 'grid',
        props: { columns: 2 },
        children: [
          { id: 'col-1', type: 'column', props: {} },
          { id: 'col-2', type: 'column', props: {} },
        ],
      },
    ],
  },
  {
    id: 'paragraph-1',
    type: 'paragraph',
    props: { text: 'root' },
  },
];

describe('addElementToParent', () => {
  it('adiciona filho a container específico sem mutar', () => {
    const tree = makeTree();
    const newEl: BuilderElement = { id: 'new-1', type: 'heading', props: {} };
    const out = addElementToParent(tree, 'col-1', newEl);
    expect(out).not.toBe(tree);
    const col1 = findElementRecursive(out, 'col-1');
    expect(col1?.children).toHaveLength(1);
    expect(col1?.children?.[0].id).toBe('new-1');
    expect(findElementRecursive(tree, 'col-1')?.children ?? []).toHaveLength(0);
  });

  it('é no-op quando parentId não existe', () => {
    const tree = makeTree();
    const out = addElementToParent(tree, 'ghost', { id: 'x', type: 'heading', props: {} });
    expect(JSON.stringify(out)).toBe(JSON.stringify(tree));
  });
});

describe('updateElementRecursive', () => {
  it('mescla props superficialmente no elemento alvo', () => {
    const tree = makeTree();
    const out = updateElementRecursive(tree, 'heading-1', { text: 'B', color: 'red' });
    const updated = findElementRecursive(out, 'heading-1');
    expect(updated?.props.text).toBe('B');
    expect(updated?.props.color).toBe('red');
  });

  it('chama onMatch permitindo transformação customizada (ex.: grid columns)', () => {
    const tree = makeTree();
    const out = updateElementRecursive(
      tree,
      'grid-1',
      { columns: 3 },
      (merged) => ({
        ...merged,
        children: [
          ...(merged.children ?? []),
          { id: 'col-3', type: 'column', props: {} },
        ],
      }),
    );
    const grid = findElementRecursive(out, 'grid-1');
    expect(grid?.props.columns).toBe(3);
    expect(grid?.children).toHaveLength(3);
  });
});

describe('deleteElementRecursive', () => {
  it('remove o elemento em qualquer profundidade', () => {
    const tree = makeTree();
    const out = deleteElementRecursive(tree, 'col-2');
    const grid = findElementRecursive(out, 'grid-1');
    expect(grid?.children).toHaveLength(1);
    expect(findElementRecursive(out, 'col-2')).toBeUndefined();
  });

  it('remove do topo também', () => {
    const tree = makeTree();
    const out = deleteElementRecursive(tree, 'paragraph-1');
    expect(out).toHaveLength(1);
    expect(findElementRecursive(out, 'paragraph-1')).toBeUndefined();
  });
});

describe('moveElementRecursive', () => {
  it('troca ordem com vizinho para baixo', () => {
    const tree = makeTree();
    const out = moveElementRecursive(tree, 'container-1', 'down');
    expect(out[0].id).toBe('paragraph-1');
    expect(out[1].id).toBe('container-1');
  });

  it('troca ordem com vizinho para cima dentro de um pai', () => {
    const tree = makeTree();
    const out = moveElementRecursive(tree, 'col-2', 'up');
    const grid = findElementRecursive(out, 'grid-1');
    expect(grid?.children?.[0].id).toBe('col-2');
    expect(grid?.children?.[1].id).toBe('col-1');
  });

  it('é no-op quando já está no extremo', () => {
    const tree = makeTree();
    const out = moveElementRecursive(tree, 'container-1', 'up');
    expect(out[0].id).toBe('container-1');
  });
});

describe('findElementRecursive', () => {
  it('encontra em profundidade', () => {
    const tree = makeTree();
    expect(findElementRecursive(tree, 'col-2')?.type).toBe('column');
  });

  it('retorna undefined para ids inexistentes', () => {
    const tree = makeTree();
    expect(findElementRecursive(tree, 'nope')).toBeUndefined();
  });
});
