import { Component, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

interface PortfolioImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface PortfolioRow {
  images: PortfolioImage[];
  // Empty flex spacers that keep a short last row at the same scale as full rows.
  fillers: number[];
}

// TEMPORARY placeholder data. Replace with the Cloudinary images (src + width/height)
// served by the Apps Script JSON snapshot.
const STOCK_IMAGES: PortfolioImage[] = [
  { src: 'https://picsum.photos/id/1011/1200/800', alt: 'Stock photo 1', width: 1200, height: 800 },
  { src: 'https://picsum.photos/id/1025/800/1000', alt: 'Stock photo 2', width: 800, height: 1000 },
  { src: 'https://picsum.photos/id/1035/1000/1000', alt: 'Stock photo 3', width: 1000, height: 1000 },
  { src: 'https://picsum.photos/id/1043/1400/800', alt: 'Stock photo 4', width: 1400, height: 800 },
  { src: 'https://picsum.photos/id/1050/800/1200', alt: 'Stock photo 5', width: 800, height: 1200 },
  { src: 'https://picsum.photos/id/1062/800/1100', alt: 'Stock photo 6', width: 800, height: 1100 },
  { src: 'https://picsum.photos/id/1074/1200/900', alt: 'Stock photo 7', width: 1200, height: 900 },
];

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
  imports: [RouterModule, CommonModule]
})
export class PortfolioComponent {
  /** How many images sit in each row. */
  readonly imagesPerRow = 2;

  readonly images = signal<PortfolioImage[]>(STOCK_IMAGES);

  readonly rows = computed<PortfolioRow[]>(() => {
    const all = this.images();
    const perRow = Math.max(1, this.imagesPerRow);
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
