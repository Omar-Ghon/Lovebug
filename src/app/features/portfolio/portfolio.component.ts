import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PortfolioImage, PortfolioService } from './portfolio.service';

interface PortfolioRow {
  images: PortfolioImage[];
  // Empty flex spacers that keep a short last row at the same scale as full rows.
  fillers: number[];
}

// Photos per row by minimum viewport width (px), widest first. Below all of them: MOBILE_IMAGES_PER_ROW.
const ROW_BREAKPOINTS = [
  { minWidth: 1024, imagesPerRow: 4 },
  { minWidth: 640, imagesPerRow: 3 }
];
const MOBILE_IMAGES_PER_ROW = 2;

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
  imports: [RouterModule, CommonModule]
})
export class PortfolioComponent {
  /** How many images sit in each row (changes with screen width, see ROW_BREAKPOINTS). */
  readonly imagesPerRow = signal(MOBILE_IMAGES_PER_ROW);

  private readonly portfolioService = inject(PortfolioService);
  readonly images = this.portfolioService.images;

  constructor() {
    this.portfolioService.load();

    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const queries = ROW_BREAKPOINTS.map(bp => ({
      list: window.matchMedia(`(min-width: ${bp.minWidth}px)`),
      imagesPerRow: bp.imagesPerRow
    }));

    const update = () => {
      const match = queries.find(q => q.list.matches);
      this.imagesPerRow.set(match ? match.imagesPerRow : MOBILE_IMAGES_PER_ROW);
    };

    update();
    queries.forEach(q => q.list.addEventListener('change', update));
    inject(DestroyRef).onDestroy(() =>
      queries.forEach(q => q.list.removeEventListener('change', update))
    );
  }

  readonly rows = computed<PortfolioRow[]>(() => {
    const all = this.images();
    const perRow = Math.max(1, this.imagesPerRow());
    const rows: PortfolioRow[] = [];
    for (let i = 0; i < all.length; i += perRow) {
      const images = all.slice(i, i + perRow);
      const fillers = Array.from({ length: perRow - images.length }, () => this.aspect(images[0]));
      rows.push({ images, fillers });
    }
    return rows;
  });

  aspect(img: PortfolioImage): number {
    return img.width / img.height;
  }
}
