import { Injectable } from '@angular/core';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly cache: Map<string, CacheItem<any>> = new Map();
  private readonly cacheTimeout = 1000 * 60 * 5; // 5 minutes

  constructor() {}

  set<T>(key: string, value: CacheItem<T>): void {
    this.cache.set(key, value);
  }

  get<T>(key: string): CacheItem<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  clear(key: string): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }
}
