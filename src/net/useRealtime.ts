import { useContext } from 'react';
import { RealtimeContext, type RealtimeValue } from './RealtimeContext';

export function useRealtime(): RealtimeValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return ctx;
}
