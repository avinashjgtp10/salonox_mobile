import { useState, useCallback } from "react";

/**
 * A reusable custom hook for handling data submission / API calls.
 * Manages loading, error, and success states automatically.
 */
export function useSubmit<T, K>(submitFn: (args: K) => Promise<T>) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<T | null>(null);

    const execute = useCallback(async (args: K) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            const result = await submitFn(args);
            setData(result);
            return result;
        } catch (err: any) {
            const message = err.message || "An unexpected error occurred.";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [submitFn]);

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setData(null);
    }, []);

    return { execute, loading, error, data, reset };
}
