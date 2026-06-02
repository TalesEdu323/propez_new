/** Ambientes serverless (Vercel/Lambda) não permitem disco persistente para PDFs. */
export function usesDbPdfStorage(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
}
