import { describe, expect, it } from 'vitest';
import { isPdfMakeImageDataUri, toPdfMakeImageDataUri } from '../pdfImageDataUri.js';

describe('pdfImageDataUri', () => {
  it('accepts png and jpeg data URIs', () => {
    expect(isPdfMakeImageDataUri('data:image/png;base64,abc')).toBe(true);
    expect(isPdfMakeImageDataUri('data:image/jpeg;base64,abc')).toBe(true);
    expect(isPdfMakeImageDataUri('data:image/jpg;base64,abc')).toBe(true);
  });

  it('rejects svg and raw URLs', () => {
    expect(isPdfMakeImageDataUri('data:image/svg+xml;base64,abc')).toBe(false);
    expect(isPdfMakeImageDataUri('https://example.com/logo.png')).toBe(false);
    expect(toPdfMakeImageDataUri('data:image/svg+xml;base64,x')).toBeNull();
  });
});
