import { SYMBOL_CACHE_DURATION } from '@/constants/values'

export interface SymbolCacheEntry {
  replacement: string
  definitions: string
  timestamp: number
}

export class SymbolCacheManager {
  private cache = new Map<string, SymbolCacheEntry>()

  get(key: string): SymbolCacheEntry | undefined {
    this.clear_old_entries()
    return this.cache.get(key)
  }

  set(key: string, replacement: string, definitions: string = ''): void {
    this.cache.set(key, {
      replacement,
      definitions,
      timestamp: Date.now()
    })
  }

  clear_old_entries(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= SYMBOL_CACHE_DURATION) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}
