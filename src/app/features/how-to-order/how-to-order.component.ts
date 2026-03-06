import { Component } from '@angular/core';
import { OrderCategory } from './models/order-categories.model';
import { ORDER_CATEGORIES } from './data/order-categories.data';
import { CategoryCardComponent } from './category-card/category-card.component';

@Component({
  selector: 'app-how-to-order-page',
  standalone: true,
  imports: [CategoryCardComponent],
  templateUrl: './how-to-order.component.html',
  styleUrl: './how-to-order.component.scss',
})
export class HowToOrderPageComponent {
  protected readonly categories = ORDER_CATEGORIES;
}