export interface OrderQuestionOption {
  label: string;
  value: string;
  price?: number;
}

/** Hard safety cap on color-list boxes, independent of any category's configured max. */
export const COLOR_LIST_HARD_CAP = 20;

/** cm-per-inch, duplicated in the Apps Script backend since the two can't share code. */
export const CM_PER_INCH = 2.54;

export interface OrderMeasurementBreakpoint {
  upToCm: number;
  price: number;
}

export interface MeasurementAnswer {
  value: number | null;
  unit: 'cm' | 'in';
}

export interface OrderQuestion {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'color-list' | 'measurement';
  required?: boolean;
  placeholder?: string;
  options?: OrderQuestionOption[];
  /** color-list only: colors covered by the base price. Defaults to 1 if unset. */
  colorIncludedCount?: number;
  /** color-list only: price per color beyond colorIncludedCount. Defaults to 0 if unset. */
  colorPricePerExtra?: number;
  /** color-list only: this category's max orderable colors. Defaults to colorIncludedCount if unset. */
  colorMaxCount?: number;
  /** measurement only: ascending-sorted price tiers, matched by ceiling (first tier whose upToCm >= the entered value converted to cm). */
  breakpoints?: OrderMeasurementBreakpoint[];
}

export interface OrderCategory {
  slug: string;
  title: string;
  image: string;
  description: string;
  basePrice?: number;
  questions: OrderQuestion[];
}