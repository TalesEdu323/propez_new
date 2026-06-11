import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPdfStorageInfo, shouldUseVercelBlob } from '../pdfStorageMode.js';

describe('pdfStorageMode', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.VERCEL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.NODE_ENV;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  });

  afterEach(() => {
    process.env = original;
  });

  it('usa blob com token na Vercel', () => {
    process.env.VERCEL = '1';
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';
    expect(getPdfStorageInfo()).toEqual({ hasBlobToken: true, pdfMode: 'blob' });
    expect(shouldUseVercelBlob()).toBe(true);
  });

  it('usa bytea em serverless sem token', () => {
    process.env.VERCEL = '1';
    expect(getPdfStorageInfo()).toEqual({ hasBlobToken: false, pdfMode: 'bytea' });
    expect(shouldUseVercelBlob()).toBe(false);
  });

  it('usa disco em dev local sem vercel', () => {
    process.env.NODE_ENV = 'development';
    expect(getPdfStorageInfo().pdfMode).toBe('disk');
  });
});
