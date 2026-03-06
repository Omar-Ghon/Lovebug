import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { ORDER_CATEGORIES } from '../data/order-categories.data';
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

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' }
  );

  protected readonly category = computed<OrderCategory | undefined>(() =>
    ORDER_CATEGORIES.find((item) => item.slug === this.slug())
  );
}