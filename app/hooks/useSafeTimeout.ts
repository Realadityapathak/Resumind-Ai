import { useCallback, useEffect, useRef } from "react";

/**
 * Schedules a timeout that is automatically cancelled when the component unmounts.
 * Use this for transient UI state resets (toasts, "copied" labels, status messages)
 * so a pending callback can never update state after teardown.
 */
export function useSafeTimeout() {
  const timeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const pending = timeouts.current;

    return () => {
      pending.forEach((timeoutId) => clearTimeout(timeoutId));
      pending.clear();
    };
  }, []);

  return useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      timeouts.current.delete(timeoutId);
      callback();
    }, delay);

    timeouts.current.add(timeoutId);
    return timeoutId;
  }, []);
}
