import { describe, expect, it } from 'vitest';
import {
  buildPollinationsImageUrl,
  buildRealismPrompt,
} from '../pollinationsImageGenerator.js';

describe('pollinationsImageGenerator', () => {
  it('buildRealismPrompt aplica sufixo base e nicho consultoria', () => {
    const result = buildRealismPrompt('Equipe em reunião', 'consultoria');
    expect(result).toContain('Equipe em reunião');
    expect(result).toContain('business executive style');
    expect(result).toContain('photorealistic');
  });

  it('buildRealismPrompt generico usa só sufixo base', () => {
    const result = buildRealismPrompt('Médico no hospital', 'generico');
    expect(result).toContain('Médico no hospital');
    expect(result).not.toContain('business executive style');
    expect(result).toContain('hyper-realistic');
  });

  it('buildPollinationsImageUrl monta URL com flux e nologo', () => {
    const { url, width, height, seed } = buildPollinationsImageUrl({
      prompt: 'Escritório moderno',
      offerType: 'saas',
      slot: 'hero_banner',
      seed: 42,
    });

    expect(url).toMatch(/^https:\/\/image\.pollinations\.ai\/prompt\//);
    expect(url).toContain('model=flux');
    expect(url).toContain('nologo=true');
    expect(url).toContain('seed=42');
    expect(url).toContain('width=1920');
    expect(url).toContain('height=600');
    expect(decodeURIComponent(url)).toContain('modern tech office');
    expect(width).toBe(1920);
    expect(height).toBe(600);
    expect(seed).toBe(42);
  });

  it('buildPollinationsImageUrl slot inline default', () => {
    const { url, width, height } = buildPollinationsImageUrl({
      prompt: 'Retrato corporativo',
      slot: 'inline',
    });
    expect(url).toContain('width=1024');
    expect(url).toContain('height=768');
    expect(width).toBe(1024);
    expect(height).toBe(768);
  });
});
