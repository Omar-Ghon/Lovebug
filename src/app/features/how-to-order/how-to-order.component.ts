import { Component } from '@angular/core';

interface OrderCategory {
  title: string;
  image: string;
}

@Component({
  selector: 'app-how-to-order',
  standalone: true,
  templateUrl: './how-to-order.component.html',
  styleUrl: './how-to-order.component.scss',
})
export class HowToOrderComponent {
  protected readonly categories: OrderCategory[] = [
    {
      title: 'Beanies',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Scarves',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Plushies',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Bouquets',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Bags',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Coasters',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Blankets',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Keychains',
      image: 'assets/images/products/beanies.png',
    },
    {
      title: 'Custom Orders',
      image: 'assets/images/products/beanies.png',
    },
  ];
}