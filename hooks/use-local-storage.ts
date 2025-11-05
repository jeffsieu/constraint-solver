"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Generic localStorage hook with JSON serialization and SSR safety.
export function useLocalStorage<T>(key: string, initialValue: T) {
  // We start with the provided initialValue both on server and first client render
  // to avoid hydration mismatches. Then we hydrate from localStorage after mount.
  const mountedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Hydrate after mount
  useEffect(() => {
    mountedRef.current = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (e) {
      console.warn("useLocalStorage: failed to parse existing value", e);
    } finally {
      setReady(true);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          }
        } catch (e) {
          console.warn("useLocalStorage: write failed", e);
        }
        return newValue;
      });
    },
    [key]
  );

  // Sync across tabs via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);

  return [storedValue, setValue, ready] as const;
}
