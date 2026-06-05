// Local storage utilities for offline-first data persistence

const PREFIX = 'traxxo_';

export const ls = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded — fail silently
    }
  },
  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },
};
