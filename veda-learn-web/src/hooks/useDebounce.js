import { useEffect, useRef } from 'react';

/**
 * Fires `callback` once `delay` ms have passed since the last call.
 * In VITE_DEMO_MODE the delay is capped at 5 000 ms for faster demos.
 * Includes smart triggering to avoid excessive API calls.
 */
export function useDebounce(callback, value, delay = 45_000) {
    const timerRef = useRef(null);
    const lastValueRef = useRef('');
    const lastCallRef = useRef(0);
    
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    const effectiveDelay = isDemoMode ? Math.min(delay, 8_000) : delay;

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Skip if value hasn't changed significantly
        const trimmedValue = value.trim();
        const lastTrimmedValue = lastValueRef.current.trim();
        
        // Only trigger if:
        // 1. Value has meaningful content (>10 chars)
        // 2. Value has changed significantly (>5% difference)
        // 3. Enough time has passed since last call (respect rate limiting)
        const hasContent = trimmedValue.length > 10;
        const hasChanged = Math.abs(trimmedValue.length - lastTrimmedValue.length) > Math.max(5, trimmedValue.length * 0.05);
        const timeSinceLastCall = Date.now() - lastCallRef.current;
        const canCall = timeSinceLastCall > 30_000; // Respect 30s rate limit
        
        if (!hasContent || !hasChanged || !canCall) {
            return;
        }

        timerRef.current = setTimeout(() => {
            lastValueRef.current = trimmedValue;
            lastCallRef.current = Date.now();
            callback(trimmedValue);
        }, effectiveDelay);

        return () => clearTimeout(timerRef.current);
    }, [value, effectiveDelay]); // eslint-disable-line react-hooks/exhaustive-deps
}
