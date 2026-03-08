import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { HowToOrderService } from '../services/how-to-order.service';
import { OrderCategory } from '../models/order-categories.model';

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category-page.component.html',
  styleUrl: './category-page.component.scss',
})
export class CategoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly howToOrderService = inject(HowToOrderService);

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' }
  );

  private readonly categories = toSignal(
    this.howToOrderService.getCategories(),
    { initialValue: [] as OrderCategory[] }
  );

  private readonly loading = toSignal(
    this.howToOrderService.getLoading(),
    { initialValue: true }
  );

  protected readonly category = computed<OrderCategory | undefined>(() =>
    this.categories().find((item) => item.slug === this.slug())
  );

  protected readonly isLoading = computed(() => this.loading());
}