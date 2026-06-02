import { useEffect } from 'react';
import { subscribeStoreSaveErrors } from '../lib/storeSaveFeedback';

/**
 * Exibe falhas de persistência do store (diffSave) que antes só iam ao console.
 */
export function StoreSaveErrorListener() {
  useEffect(() => {
    return subscribeStoreSaveErrors((message) => {
      alert(message);
    });
  }, []);
  return null;
}
