/**
 * jsdom in this Vitest version does not expose Web Storage on `window`
 * (and Node 24's experimental `localStorage` throws without a backing file).
 * Client tests only need read/write/key/length, so a small in-memory Storage
 * keeps them deterministic.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => { map.clear() },
    getItem: (key: string) => map.get(String(key)) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(String(key)) },
    setItem: (key: string, value: string) => { map.set(String(key), String(value)) },
  }
}

if (typeof window !== 'undefined') {
  const local = (() => { try { return window.localStorage } catch { return undefined } })()
  const session = (() => { try { return window.sessionStorage } catch { return undefined } })()
  const localStore = local ?? createMemoryStorage()
  const sessionStore = session ?? createMemoryStorage()
  Object.defineProperty(window, 'localStorage', { configurable: true, writable: true, value: localStore })
  Object.defineProperty(window, 'sessionStorage', { configurable: true, writable: true, value: sessionStore })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: localStore })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, writable: true, value: sessionStore })
}
