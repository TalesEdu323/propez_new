import { describe, expect, it } from 'vitest';
import {
  getSlotDimensions,
  getSlotForElement,
  buildSlotPrompt,
} from '../imageSlotCatalog.js';

describe('imageSlotCatalog', () => {
  it('getSlotDimensions hero_banner', () => {
    expect(getSlotDimensions('hero_banner')).toEqual({ width: 1920, height: 600 });
  });

  it('getSlotForElement marketing_hero backgroundImageUrl', () => {
    expect(getSlotForElement('marketing_hero', 'backgroundImageUrl')).toBe('hero_banner');
  });

  it('getSlotForElement image url', () => {
    expect(getSlotForElement('image', 'url')).toBe('inline');
  });

  it('buildSlotPrompt adiciona hint do slot', () => {
    const result = buildSlotPrompt('Equipe corporativa', 'hero_banner');
    expect(result).toContain('negative space for text overlay');
  });
});
