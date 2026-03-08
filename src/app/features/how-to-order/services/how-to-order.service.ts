import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrderCategory } from '../models/order-categories.model';

interface OrderCategoriesApiResponse {
  success: boolean;
  version: string;
  lastUpdated: string;
  data: OrderCategory[];
  error?: string;
}

interface OrderCategoriesMetaResponse {
  success: boolean;
  version: string;
  lastUpdated: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HowToOrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.lovebugApiUrl;
  private readonly fallbackUrl = 'assets/data/order-categories.json';

  private readonly storageKeys = {
    data: 'lovebug_categories_data',
    version: 'lovebug_categories_version',
    lastUpdated: 'lovebug_categories_last_updated'
  };

  private readonly categoriesSubject = new BehaviorSubject<OrderCategory[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);

  private hasInitialized = false;
  private metaCheckPromise?: Promise<void>;
  private fullFetchPromise?: Promise<void>;

  constructor() {
    this.loadFromLocalStorage();
  }

  getCategories(forceRefresh = false): Observable<OrderCategory[]> {
    if (!this.hasInitialized) {
      this.hasInitialized = true;
      void this.initialize(forceRefresh);
    } else if (forceRefresh) {
      void this.fetchAndStoreFullData();
    }

    return this.categoriesSubject.asObservable();
  }

  getLoading(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  private async initialize(forceRefresh: boolean): Promise<void> {
    this.loadingSubject.next(true);

    try {
      if (forceRefresh) {
        await this.fetchAndStoreFullData();
        return;
      }

      const cachedData = this.categoriesSubject.value;
      const cachedVersion = this.getStoredVersion();

      if (cachedData.length && cachedVersion) {
        this.loadingSubject.next(false);
        void this.checkForUpdates();
        return;
      }

      const fallbackLoaded = await this.loadFromFallbackAsset();

      if (fallbackLoaded) {
        this.loadingSubject.next(false);
        void this.checkForUpdates();
        return;
      }

      await this.fetchAndStoreFullData();
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKeys.data);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as OrderCategory[];

      if (Array.isArray(parsed) && parsed.length) {
        this.categoriesSubject.next(parsed);
      }
    } catch (error) {
      console.error('Failed to load Lovebug categories from localStorage:', error);
      this.clearStoredCache();
    }
  }

  private async loadFromFallbackAsset(): Promise<boolean> {
    try {
      const fallbackResponse = await firstValueFrom(
        this.http.get<OrderCategoriesApiResponse>(this.fallbackUrl)
      );

      if (!fallbackResponse?.success) {
        return false;
      }

      const categories = Array.isArray(fallbackResponse.data)
        ? fallbackResponse.data
        : [];

      if (!categories.length) {
        return false;
      }

      this.categoriesSubject.next(categories);
      this.storeCache(
        categories,
        fallbackResponse.version,
        fallbackResponse.lastUpdated
      );

      return true;
    } catch (error) {
      console.error('Failed to load Lovebug fallback categories:', error);
      return false;
    }
  }

  private async checkForUpdates(): Promise<void> {
    if (this.metaCheckPromise) {
      return this.metaCheckPromise;
    }

    this.metaCheckPromise = (async () => {
      try {
        const metaUrl = `${this.apiUrl}?meta=1`;
        const meta = await firstValueFrom(
          this.http.get<OrderCategoriesMetaResponse>(metaUrl)
        );

        if (!meta?.success) {
          throw new Error(meta?.error || 'Failed to load category metadata.');
        }

        const storedVersion = this.getStoredVersion();

        if (meta.version !== storedVersion) {
          await this.fetchAndStoreFullData();
        }
      } catch (error) {
        console.error('Failed to check Lovebug category updates:', error);
      } finally {
        this.metaCheckPromise = undefined;
      }
    })();

    return this.metaCheckPromise;
  }

  private async fetchAndStoreFullData(): Promise<void> {
    if (this.fullFetchPromise) {
      return this.fullFetchPromise;
    }

    this.fullFetchPromise = (async () => {
      try {
        const response = await firstValueFrom(
          this.http.get<OrderCategoriesApiResponse>(this.apiUrl)
        );

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to load categories.');
        }

        const categories = Array.isArray(response.data) ? response.data : [];

        this.categoriesSubject.next(categories);
        this.storeCache(categories, response.version, response.lastUpdated);
      } catch (error) {
        console.error('Failed to fetch Lovebug categories:', error);
      } finally {
        this.fullFetchPromise = undefined;
      }
    })();

    return this.fullFetchPromise;
  }

  private storeCache(
    categories: OrderCategory[],
    version: string,
    lastUpdated: string
  ): void {
    try {
      localStorage.setItem(this.storageKeys.data, JSON.stringify(categories));
      localStorage.setItem(this.storageKeys.version, version);
      localStorage.setItem(this.storageKeys.lastUpdated, lastUpdated);
    } catch (error) {
      console.error('Failed to store Lovebug categories cache:', error);
    }
  }

  private getStoredVersion(): string | null {
    return localStorage.getItem(this.storageKeys.version);
  }

  private clearStoredCache(): void {
    localStorage.removeItem(this.storageKeys.data);
    localStorage.removeItem(this.storageKeys.version);
    localStorage.removeItem(this.storageKeys.lastUpdated);
  }
}