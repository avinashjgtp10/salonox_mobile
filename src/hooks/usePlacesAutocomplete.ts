import { useState, useEffect, useRef, useCallback } from "react";
import { type PlacePrediction } from "../types/location";
import { MapsService } from "../services/maps/maps.service";

// In-memory cache map spanning the current user session
const sessionAutocompleteCache = new Map<string, PlacePrediction[]>();

export interface UsePlacesAutocompleteResult {
  suggestions: PlacePrediction[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

/**
 * Custom hook to fetch debounced Google Place Autocomplete suggestions with session cache checks.
 */
export function usePlacesAutocomplete(debounceMs: number = 400): UsePlacesAutocompleteResult {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inputValue, setInputValue] = useState("");
  const timerRef = useRef<any>(null);

  // Maintain a reference to query suggestions and handle actual API request
  const fetchSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Rule 5: Check session cache map first before making network requests
    const cacheKey = trimmed.toLowerCase();
    if (sessionAutocompleteCache.has(cacheKey)) {
      setSuggestions(sessionAutocompleteCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await MapsService.autocomplete(trimmed);
      sessionAutocompleteCache.set(cacheKey, results); // Cache results
      setSuggestions(results);
    } catch (err: any) {
      setError(err.message || "Failed to fetch address suggestions.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set input query value and schedule debounced execution
  const search = useCallback((query: string) => {
    setInputValue(query);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setInputValue("");
  }, []);

  // Handle debouncing inside useEffect
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [inputValue, fetchSuggestions, debounceMs]);

  return {
    suggestions,
    loading,
    error,
    search,
    clearSuggestions,
  };
}
