import { useEffect, useRef } from 'react';

/**
 * Fires `callback` once `delay` ms have passed since the last call.
 * In VITE_DEMO_MODE the delay is capped at 5 000 ms for faster demos.
 */
export function useDebounce(callback, value, delay = 30_000) {
    const timerRef = useRef(null);
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    const effectiveDelay = isDemoMode ? Math.min(delay, 5_000) : delay;

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (value.trim().length > 0) callback(value);
        }, effectiveDelay);

        return () => clearTimeout(timerRef.current);
    }, [value, effectiveDelay]); // eslint-disable-line react-hooks/exhaustive-deps
}
