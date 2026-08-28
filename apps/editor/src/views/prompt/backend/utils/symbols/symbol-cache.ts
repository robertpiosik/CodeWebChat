import { SYMBOL_CACHE_DURATION } from '@/constants/values'

export interface SymbolCacheEntry {
  replacement: string
  definitions: string
  timestamp: number
}

export class SymbolCacheManager {
  private cache = new Map<string, SymbolCacheEntry>()

  public get(key: string): SymbolCacheEntry | undefined {
    this.clear_old_entries()
    return this.cache.get(key)
  }

  public set(key: string, replacement: string, definitions: string = ''): void {
    this.cache.set(key, {
      replacement,
      definitions,
      timestamp: Date.now()
    })
  }

  public clear_old_entries(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= SYMBOL_CACHE_DURATION) {
        this.cache.delete(key)
      }
    }
  }

  public clear(): void {
    this.cache.clear()
  }
}
