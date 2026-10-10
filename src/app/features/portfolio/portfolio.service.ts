import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PortfolioImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface PortfolioApiResponse {
  success: boolean;
  version: string;
  lastUpdated: string;
  data?: PortfolioImage[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.lovebugApiUrl}?type=portfolio`;
  private readonly fallbackUrl = 'assets/data/portfolio.json';

  private readonly storageKeys = {
    data: 'lovebug_portfolio_data',
    version: 'lovebug_portfolio_version',
    lastUpdated: 'lovebug_portfolio_last_updated'
  };

  private readonly imagesSignal = signal<PortfolioImage[]>([]);
  readonly images = this.imagesSignal.asReadonly();

  private hasInitialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  /** Safe to call repeatedly; only the first call does any work. */
  load(): void {
    if (this.hasInitialized) {
      return;
    }

    this.hasInitialized = true;
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.imagesSignal().length && this.getStoredVersion()) {
      void this.checkForUpdates();
      return;
    }

    if (await this.loadFromSnapshot()) {
      void this.checkForUpdates();
      return;
    }

    await this.fetchAndStoreFullData();
  }

  private loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKeys.data);

      if (!raw) {
        return;
      }

      const images = this.sanitize(JSON.parse(raw));

      if (images.length) {
        this.imagesSignal.set(images);
      }
    } catch (error) {
      console.error('Failed to load Lovebug portfolio from localStorage:', error);
      this.clearStoredCache();
    }
  }

  private async loadFromSnapshot(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<PortfolioApiResponse>(this.fallbackUrl)
      );

      const images = this.sanitize(response?.data);

      if (!response?.success || !images.length) {
        return false;
      }

      this.imagesSignal.set(images);
      this.storeCache(images, response.version, response.lastUpdated);
      return true;
    } catch (error) {
      console.error('Failed to load Lovebug portfolio snapshot:', error);
      return false;
    }
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const meta = await firstValueFrom(
        this.http.get<PortfolioApiResponse>(`${this.apiUrl}&meta=1`)
      );

      if (!meta?.success) {
        throw new Error(meta?.error || 'Failed to load portfolio metadata.');
      }

      if (meta.version !== this.getStoredVersion()) {
        await this.fetchAndStoreFullData();
      }
    } catch (error) {
      console.error('Failed to check Lovebug portfolio updates:', error);
    }
  }

  private async fetchAndStoreFullData(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<PortfolioApiResponse>(this.apiUrl)
      );

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to load portfolio.');
      }

      const images = this.sanitize(response.data);

      this.imagesSignal.set(images);
      this.storeCache(images, response.version, response.lastUpdated);
    } catch (error) {
      console.error('Failed to fetch Lovebug portfolio:', error);
    }
  }

  /** Drops anything that can't be rendered (bad link or size). */
  private sanitize(value: unknown): PortfolioImage[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (item): item is PortfolioImage =>
        !!item &&
        typeof item.src === 'string' &&
        item.src.length > 0 &&
        Number(item.width) > 0 &&
        Number(item.height) > 0
    );
  }

  private storeCache(images: PortfolioImage[], version: string, lastUpdated: string): void {
    try {
      localStorage.setItem(this.storageKeys.data, JSON.stringify(images));
      localStorage.setItem(this.storageKeys.version, version);
      localStorage.setItem(this.storageKeys.lastUpdated, lastUpdated);
    } catch (error) {
      console.error('Failed to store Lovebug portfolio cache:', error);
    }
  }

  private getStoredVersion(): string | null {
    try {
      return localStorage.getItem(this.storageKeys.version);
    } catch {
      return null;
    }
  }

  private clearStoredCache(): void {
    try {
      localStorage.removeItem(this.storageKeys.data);
      localStorage.removeItem(this.storageKeys.version);
      localStorage.removeItem(this.storageKeys.lastUpdated);
    } catch {
      // ignore
    }
  }
}
