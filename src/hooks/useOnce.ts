import { useCallback, useRef, useState } from 'react'
 
export function useOnce<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): [(...args: T) => Promise<void>, boolean] {
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)
 
  const wrapped = useCallback(async (...args: T) => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      await fn(...args)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [fn])
 
  return [wrapped, loading]
}