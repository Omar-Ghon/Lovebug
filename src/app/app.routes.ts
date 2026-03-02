import { Routes } from '@angular/router';
import { MainviewComponent } from './layout/mainview/mainview.component';
import { HomePageComponent } from './features/home/home-page.component';
import { HowToOrderComponent } from './features/how-to-order/how-to-order.component';
import { PortfolioComponent } from './features/portfolio/portfolio.component';
import { AboutMeComponent } from './features/about-me/about-me.component';

export const routes: Routes = [
  {
    path: '',
    component: MainviewComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'how-to-order', component: HowToOrderComponent},
      { path: 'portfolio', component: PortfolioComponent},
      { path: 'about', component: AboutMeComponent },
    ],
  },
];