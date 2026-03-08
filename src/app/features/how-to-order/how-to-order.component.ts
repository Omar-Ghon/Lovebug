import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryCardComponent } from './category-card/category-card.component';
import { OrderCategory } from './models/order-categories.model';
import { HowToOrderService } from './services/how-to-order.service';

@Component({
  selector: 'app-how-to-order-page',
  standalone: true,
  imports: [CategoryCardComponent],
  templateUrl: './how-to-order.component.html',
  styleUrl: './how-to-order.component.scss',
})
export class HowToOrderPageComponent {
  private readonly howToOrderService = inject(HowToOrderService);
  private readonly destroyRef = inject(DestroyRef);

  protected categories: OrderCategory[] = [];
  protected isLoading = true;
  protected errorMessage = '';

  constructor() {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.howToOrderService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.error('Failed to load categories:', error);
          this.errorMessage = 'Unable to load categories right now.';
        }
      });

    this.howToOrderService
      .getLoading()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loading) => {
          this.isLoading = loading;
        },
        error: (error) => {
          console.error('Failed to read loading state:', error);
          this.isLoading = false;
        }
      });
  }
}