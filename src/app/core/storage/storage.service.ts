import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_PREFIX = 'bs_adaptif_';
  private isBrowser = typeof localStorage !== 'undefined';

  prefixedKey(key: string): string {
    return this.STORAGE_PREFIX + key;
  }

  get<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem(this.STORAGE_PREFIX + key);
    return data ? (JSON.parse(data) as T) : null;
  }

  set<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.STORAGE_PREFIX + key);
  }

  clear(): void {
    if (!this.isBrowser) return;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}
