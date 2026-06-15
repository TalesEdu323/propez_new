import { useEffect } from 'react';
import { toast } from '../lib/feedback';
import {
  subscribeStoreSaveErrors,
  subscribeStoreSaveSuccess,
} from '../lib/storeSaveFeedback';
import { ToastProvider } from './feedback/ToastProvider';
import { ConfirmProvider } from './feedback/ConfirmProvider';

function StoreSaveFeedbackListener() {
  useEffect(() => {
    const unsubError = subscribeStoreSaveErrors((message) => {
      toast.error(message);
    });
    const unsubSuccess = subscribeStoreSaveSuccess((message) => {
      toast.success(message);
    });
    return () => {
      unsubError();
      unsubSuccess();
    };
  }, []);
  return null;
}

/** Providers globais de toast/confirmação + listener de persistência do store. */
export function FeedbackProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <StoreSaveFeedbackListener />
        {children}
      </ConfirmProvider>
    </ToastProvider>
  );
}
