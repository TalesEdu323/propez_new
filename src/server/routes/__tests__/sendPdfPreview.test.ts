import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { sendPdfPreview } from '../contratos.js';

describe('sendPdfPreview', () => {
  it('envia PDF com Cache-Control no-store e sem ETag', () => {
    const headers: Record<string, string> = {};
    const removed: string[] = [];
    const end = vi.fn();
    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      removeHeader(name: string) {
        removed.push(name);
      },
      end,
    } as unknown as Response;

    const buf = Buffer.from('%PDF-1.4 test');
    sendPdfPreview(res, buf, 'contrato-preview.pdf');

    expect(res.statusCode).toBe(200);
    expect(headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
    expect(headers.pragma).toBe('no-cache');
    expect(headers['content-type']).toBe('application/pdf');
    expect(headers['content-disposition']).toBe('inline; filename="contrato-preview.pdf"');
    expect(removed).toContain('ETag');
    expect(end).toHaveBeenCalledWith(buf);
  });
});
