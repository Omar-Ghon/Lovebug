import { Routes } from '@angular/router';
import { MainviewComponent } from './layout/mainview/mainview.component';
import { HomePageComponent } from './features/home/home-page.component';
import { HowToOrderPageComponent } from './features/how-to-order/how-to-order.component';
import { CategoryPageComponent } from './features/how-to-order/category-page/category-page.component';
import { PortfolioComponent } from './features/portfolio/portfolio.component';
import { AboutMeComponent } from './features/about-me/about-me.component';

export const routes: Routes = [
  {
    path: '',
    component: MainviewComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'how-to-order', component: HowToOrderPageComponent},
      {
        path: 'how-to-order/:slug',
        component: CategoryPageComponent,
      },
      { path: 'portfolio', component: PortfolioComponent},
      { path: 'about', component: AboutMeComponent },
    ],
  },
];