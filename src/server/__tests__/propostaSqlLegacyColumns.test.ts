import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const PROPOSTA_SQL_FILES = [
  'src/server/routes/publicPropostas.ts',
  'src/server/services/proposalJourney.ts',
  'src/server/services/proposalNotificationContext.ts',
  'src/server/services/contractSignedPdf.ts',
  'src/server/routes/propostas.ts',
] as const;

/** Padrões que indicam colunas legadas rubrica_* na tabela propostas (pós-migration 016). */
const FORBIDDEN_SQL_PATTERNS: RegExp[] = [
  /\bp\.rubrica_/,
  /,\s*rubrica_signing_url\b(?!\s+AS)/,
  /,\s*rubrica_status\b(?!\s+AS)/,
  /,\s*rubrica_document_id\b/,
  /,\s*rubrica_signed_pdf_url\b(?!\s+AS)/,
  /,\s*rubrica_last_sync_at\b/,
  /COALESCE\([^)]*\brubrica_/,
];

function extractSqlTemplateLiterals(source: string): string[] {
  const literals: string[] = [];
  const re = /`([^`]*(?:\\`[^`]*)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const body = match[1];
    if (/SELECT|UPDATE|INSERT|DELETE|FROM\s+propostas/i.test(body)) {
      literals.push(body);
    }
  }
  return literals;
}

describe('propostas SQL sem colunas rubrica_* legadas', () => {
  for (const relPath of PROPOSTA_SQL_FILES) {
    it(`${relPath} não referencia rubrica_* em propostas`, () => {
      const fullPath = path.join(repoRoot, relPath);
      const source = fs.readFileSync(fullPath, 'utf8');
      const sqlBlocks = extractSqlTemplateLiterals(source);

      for (const sql of sqlBlocks) {
        for (const pattern of FORBIDDEN_SQL_PATTERNS) {
          expect(sql, `SQL em ${relPath} contém padrão proibido ${pattern}`).not.toMatch(pattern);
        }
      }
    });
  }
});
