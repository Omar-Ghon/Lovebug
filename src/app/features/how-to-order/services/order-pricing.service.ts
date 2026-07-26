import { Injectable } from '@angular/core';

import { COLOR_LIST_HARD_CAP, OrderCategory } from '../models/order-categories.model';

export interface PricingLineItem {
  label: string;
  amount: number;
}

export interface PricingBreakdown {
  items: PricingLineItem[];
  total: number;
}

/**
 * Display-only estimate for the customer while filling out the order form.
 * The authoritative price is always recalculated server-side (Apps Script `doPost`)
 * from the same Sheet-backed category/question data — this service must never be
 * trusted as the source of truth for what actually gets charged.
 */
@Injectable({
  providedIn: 'root'
})
export class OrderPricingService {
  calculate(
    category: OrderCategory | undefined,
    answers: Record<string, unknown> | null | undefined
  ): PricingBreakdown {
    const baseFee = this.toAmount(category?.basePrice);
    const items: PricingLineItem[] = [{ label: 'Base Fee', amount: baseFee }];

    const safeAnswers = answers ?? {};

    (category?.questions ?? []).forEach((question) => {
      if (question.type === 'color-list') {
        const rawValue = safeAnswers[question.key];
        const colorsArray = Array.isArray(rawValue) ? rawValue : [];
        const filledCount = colorsArray.filter(
          (color) => typeof color === 'string' && color.trim().length > 0
        ).length;

        const includedCount =
          typeof question.colorIncludedCount === 'number' && question.colorIncludedCount >= 0
            ? question.colorIncludedCount
            : 1;
        const configuredMax =
          typeof question.colorMaxCount === 'number' && question.colorMaxCount > 0
            ? question.colorMaxCount
            : includedCount;
        const effectiveMax = Math.min(configuredMax, COLOR_LIST_HARD_CAP);
        const billableCount = Math.min(filledCount, effectiveMax);
        const extraCount = Math.max(0, billableCount - includedCount);

        const pricePerExtra =
          typeof question.colorPricePerExtra === 'number' && question.colorPricePerExtra >= 0
            ? question.colorPricePerExtra
            : 0;
        const amount = extraCount * pricePerExtra;

        if (amount > 0) {
          items.push({
            label: `${question.label}: ${extraCount} extra color${extraCount === 1 ? '' : 's'}`,
            amount
          });
        }

        return;
      }

      if (question.type !== 'select' || !question.options?.length) {
        return;
      }

      const answerValue = safeAnswers[question.key];

      if (answerValue == null || answerValue === '') {
        return;
      }

      const selectedOption = question.options.find(
        (option) => option.value === answerValue
      );

      const amount = this.toAmount(selectedOption?.price);

      if (!selectedOption || amount <= 0) {
        return;
      }

      items.push({
        label: `${question.label}: ${selectedOption.label}`,
        amount
      });
    });

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return { items, total };
  }

  private toAmount(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
