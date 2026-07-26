import { OrderPricingService } from './order-pricing.service';
import { OrderCategory } from '../models/order-categories.model';

describe('OrderPricingService', () => {
  let service: OrderPricingService;

  const category: OrderCategory = {
    slug: 'book-covers',
    title: 'Book Covers',
    image: 'assets/images/book-covers.png',
    description: 'Custom crochet book covers.',
    basePrice: 30,
    questions: [
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        required: true,
        options: [
          { label: 'Simple / Plain stitch', value: 'simple', price: 0 },
          { label: 'Striped', value: 'striped', price: 5 },
          { label: 'Granny Square', value: 'granny', price: 15 }
        ]
      },
      {
        key: 'closure',
        label: 'Closure',
        type: 'select',
        required: true,
        options: [
          { label: 'None', value: 'none', price: 0 },
          { label: 'Button', value: 'button', price: 4 },
          { label: 'Tie', value: 'tie', price: 3 }
        ]
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        required: false
      },
      {
        key: 'colors',
        label: 'Colors',
        type: 'color-list',
        required: true,
        colorIncludedCount: 1,
        colorPricePerExtra: 3,
        colorMaxCount: 3
      }
    ]
  };

  beforeEach(() => {
    service = new OrderPricingService();
  });

  it('returns just the base fee when there are no answers', () => {
    const result = service.calculate(category, {});

    expect(result.total).toBe(30);
    expect(result.items).toEqual([{ label: 'Base Fee', amount: 30 }]);
  });

  it('adds a line item for a single priced option', () => {
    const result = service.calculate(category, { style: 'striped' });

    expect(result.total).toBe(35);
    expect(result.items).toEqual([
      { label: 'Base Fee', amount: 30 },
      { label: 'Style: Striped', amount: 5 }
    ]);
  });

  it('adds line items for multiple priced options', () => {
    const result = service.calculate(category, {
      style: 'granny',
      closure: 'button'
    });

    expect(result.total).toBe(49);
    expect(result.items).toEqual([
      { label: 'Base Fee', amount: 30 },
      { label: 'Style: Granny Square', amount: 15 },
      { label: 'Closure: Button', amount: 4 }
    ]);
  });

  it('omits the line item when the selected option has no price (0 or unset)', () => {
    const result = service.calculate(category, {
      style: 'simple',
      closure: 'none'
    });

    expect(result.total).toBe(30);
    expect(result.items).toEqual([{ label: 'Base Fee', amount: 30 }]);
  });

  it('ignores answers for non-select questions and unknown option values', () => {
    const result = service.calculate(category, {
      notes: 'please rush this',
      style: 'not-a-real-option'
    });

    expect(result.total).toBe(30);
    expect(result.items).toEqual([{ label: 'Base Fee', amount: 30 }]);
  });

  it('treats a missing basePrice as $0', () => {
    const unpriced: OrderCategory = { ...category, basePrice: undefined };

    const result = service.calculate(unpriced, {});

    expect(result.total).toBe(0);
    expect(result.items).toEqual([{ label: 'Base Fee', amount: 0 }]);
  });

  it('handles an undefined category gracefully', () => {
    const result = service.calculate(undefined, {});

    expect(result.total).toBe(0);
    expect(result.items).toEqual([{ label: 'Base Fee', amount: 0 }]);
  });

  describe('color-list pricing', () => {
    it('charges nothing when only the included color is filled in', () => {
      const result = service.calculate(category, { colors: ['Pink'] });

      expect(result.total).toBe(30);
      expect(result.items).toEqual([{ label: 'Base Fee', amount: 30 }]);
    });

    it('charges per extra color beyond the included count', () => {
      const result = service.calculate(category, {
        colors: ['Pink', 'Cream', 'Sage Green']
      });

      expect(result.total).toBe(36);
      expect(result.items).toEqual([
        { label: 'Base Fee', amount: 30 },
        { label: 'Colors: 2 extra colors', amount: 6 }
      ]);
    });

    it('caps billable colors at the category max even if more were submitted', () => {
      const result = service.calculate(category, {
        colors: ['Pink', 'Cream', 'Sage Green', 'Blue', 'Yellow']
      });

      expect(result.total).toBe(36);
      expect(result.items).toEqual([
        { label: 'Base Fee', amount: 30 },
        { label: 'Colors: 2 extra colors', amount: 6 }
      ]);
    });

    it('ignores blank entries when counting filled colors', () => {
      const result = service.calculate(category, {
        colors: ['Pink', '', '   ', 'Cream']
      });

      expect(result.total).toBe(33);
      expect(result.items).toEqual([
        { label: 'Base Fee', amount: 30 },
        { label: 'Colors: 1 extra color', amount: 3 }
      ]);
    });

    it('charges nothing when the array is empty or missing', () => {
      const emptyResult = service.calculate(category, { colors: [] });
      const missingResult = service.calculate(category, {});

      expect(emptyResult.total).toBe(30);
      expect(missingResult.total).toBe(30);
    });

    it('falls back to safe defaults when pricing config is unset', () => {
      const unconfigured: OrderCategory = {
        ...category,
        questions: [
          ...category.questions.filter((q) => q.key !== 'colors'),
          { key: 'colors', label: 'Colors', type: 'color-list', required: false }
        ]
      };

      const result = service.calculate(unconfigured, {
        colors: ['Pink', 'Cream', 'Sage Green']
      });

      expect(result.total).toBe(30);
      expect(result.items).toEqual([{ label: 'Base Fee', amount: 30 }]);
    });
  });
});
