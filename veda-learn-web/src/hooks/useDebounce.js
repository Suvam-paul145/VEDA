import { useEffect, useRef } from 'react';
import api from '../lib/api';

/**
 * Fires `callback` once `delay` ms have passed since the last call.
 * In VITE_DEMO_MODE the delay is capped at 8 000 ms for faster demos.
 * Includes smart triggering to avoid excessive API calls.
 */
export function useDebounce(callback, value, delay = 45_000) {
    const timerRef = useRef(null);
    const lastValueRef = useRef(null);  // null = no previous value yet
    
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    const effectiveDelay = isDemoMode ? Math.min(delay, 8_000) : delay;

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        const trimmedValue = value.trim();

        // Skip the very first render (file just opened, nothing to compare)
        if (lastValueRef.current === null) {
            lastValueRef.current = trimmedValue;
            return;
        }

        const lastTrimmedValue = lastValueRef.current;

        // Only trigger if:
        // 1. Value has meaningful content (>10 chars)
        // 2. Value has actually changed significantly (>5% length difference)
        // 3. The API rate-limit cooldown has expired
        const hasContent = trimmedValue.length > 10;
        const hasChanged = Math.abs(trimmedValue.length - lastTrimmedValue.length) > Math.max(5, trimmedValue.length * 0.05);
        
        if (!hasContent || !hasChanged) {
            return;
        }

        timerRef.current = setTimeout(() => {
            // Re-check rate limit right before firing (cooldown may have started
            // between scheduling and execution)
            if (!api.canAnalyze()) {
                return;
            }
            lastValueRef.current = trimmedValue;
            callback(trimmedValue);
        }, effectiveDelay);

        return () => clearTimeout(timerRef.current);
    }, [value, effectiveDelay]); // eslint-disable-line react-hooks/exhaustive-deps
}
