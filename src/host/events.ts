import { getContext } from './context';

export function onHostEvent(typeKey: string, handler: (...args: unknown[]) => void): () => void {
  const ctx = getContext();
  if (!ctx) return () => undefined;
  const name = ctx.eventTypes?.[typeKey] ?? typeKey;
  ctx.eventSource.on(name, handler);
  return () => ctx.eventSource.off?.(name, handler);
}
