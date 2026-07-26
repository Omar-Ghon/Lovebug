export interface OrderQuestionOption {
  label: string;
  value: string;
  price?: number;
}

/** Hard safety cap on color-list boxes, independent of any category's configured max. */
export const COLOR_LIST_HARD_CAP = 20;

export interface OrderQuestion {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'color-list';
  required?: boolean;
  placeholder?: string;
  options?: OrderQuestionOption[];
  /** color-list only: colors covered by the base price. Defaults to 1 if unset. */
  colorIncludedCount?: number;
  /** color-list only: price per color beyond colorIncludedCount. Defaults to 0 if unset. */
  colorPricePerExtra?: number;
  /** color-list only: this category's max orderable colors. Defaults to colorIncludedCount if unset. */
  colorMaxCount?: number;
}

export interface OrderCategory {
  slug: string;
  title: string;
  image: string;
  description: string;
  basePrice?: number;
  questions: OrderQuestion[];
}