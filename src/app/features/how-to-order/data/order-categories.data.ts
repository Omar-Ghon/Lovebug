import { OrderCategory } from "../models/order-categories.model";

export const ORDER_CATEGORIES: OrderCategory[] = [
  {
    slug: 'beanies',
    title: 'Beanies',
    image: 'assets/images/products/beanies.png',
    description:
      'Our crochet beanies are handmade with care and can be customized in color, style, and size. Share your preferences below so we can create the best fit for you.',
    questions: [
      {
        key: 'headSize',
        label: 'Head size',
        type: 'text',
        required: true,
        placeholder: 'Enter head size in inches or cm',
      },
      {
        key: 'color',
        label: 'Preferred color',
        type: 'text',
        required: true,
        placeholder: 'Example: cream, sage green, brown',
      },
      {
        key: 'style',
        label: 'Beanie style',
        type: 'select',
        required: true,
        options: [
          { label: 'Classic', value: 'classic' },
          { label: 'Folded Brim', value: 'folded-brim' },
          { label: 'Slouchy', value: 'slouchy' },
        ],
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
  {
    slug: 'scarves',
    title: 'Scarves',
    image: 'assets/images/products/beanies.png',
    description:
      'Our scarves are handmade and customizable in length, width, style, and color.',
    questions: [
      {
        key: 'length',
        label: 'Preferred length',
        type: 'text',
        required: true,
        placeholder: 'Short, medium, long, or exact measurement',
      },
      {
        key: 'color',
        label: 'Preferred color',
        type: 'text',
        required: true,
        placeholder: 'Enter your preferred color',
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
  {
    slug: 'plushies',
    title: 'Plushies',
    image: 'assets/images/products/beanies.png',
    description:
      'Our crochet plushies can be made in different characters, sizes, and colors.',
    questions: [
      {
        key: 'character',
        label: 'What plushie would you like?',
        type: 'text',
        required: true,
        placeholder: 'Example: frog, bear, bunny',
      },
      {
        key: 'size',
        label: 'Preferred size',
        type: 'select',
        required: true,
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
        ],
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
    {
    slug: 'beanies',
    title: 'Beanies',
    image: 'assets/images/products/beanies.png',
    description:
      'Our crochet beanies are handmade with care and can be customized in color, style, and size. Share your preferences below so we can create the best fit for you.',
    questions: [
      {
        key: 'headSize',
        label: 'Head size',
        type: 'text',
        required: true,
        placeholder: 'Enter head size in inches or cm',
      },
      {
        key: 'color',
        label: 'Preferred color',
        type: 'text',
        required: true,
        placeholder: 'Example: cream, sage green, brown',
      },
      {
        key: 'style',
        label: 'Beanie style',
        type: 'select',
        required: true,
        options: [
          { label: 'Classic', value: 'classic' },
          { label: 'Folded Brim', value: 'folded-brim' },
          { label: 'Slouchy', value: 'slouchy' },
        ],
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
  {
    slug: 'scarves',
    title: 'Scarves',
    image: 'assets/images/products/beanies.png',
    description:
      'Our scarves are handmade and customizable in length, width, style, and color.',
    questions: [
      {
        key: 'length',
        label: 'Preferred length',
        type: 'text',
        required: true,
        placeholder: 'Short, medium, long, or exact measurement',
      },
      {
        key: 'color',
        label: 'Preferred color',
        type: 'text',
        required: true,
        placeholder: 'Enter your preferred color',
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
  {
    slug: 'plushies',
    title: 'Plushies',
    image: 'assets/images/products/beanies.png',
    description:
      'Our crochet plushies can be made in different characters, sizes, and colors.',
    questions: [
      {
        key: 'character',
        label: 'What plushie would you like?',
        type: 'text',
        required: true,
        placeholder: 'Example: frog, bear, bunny',
      },
      {
        key: 'size',
        label: 'Preferred size',
        type: 'select',
        required: true,
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
        ],
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
    {
    slug: 'beanies',
    title: 'Beanies',
    image: 'assets/images/products/beanies.png',
    description:
      'Our crochet beanies are handmade with care and can be customized in color, style, and size. Share your preferences below so we can create the best fit for you.',
    questions: [
      {
        key: 'headSize',
        label: 'Head size',
        type: 'text',
        required: true,
        placeholder: 'Enter head size in inches or cm',
      },
      {
        key: 'color',
        label: 'Preferred color',
        type: 'text',
        required: true,
        placeholder: 'Example: cream, sage green, brown',
      },
      {
        key: 'style',
        label: 'Beanie style',
        type: 'select',
        required: true,
        options: [
          { label: 'Classic', value: 'classic' },
          { label: 'Folded Brim', value: 'folded-brim' },
          { label: 'Slouchy', value: 'slouchy' },
        ],
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
  {
    slug: 'scarves',
    title: 'Scarves',
    image: 'assets/images/products/beanies.png',
    description:
      'Our scarves are handmade and customizable in length, width, style, and color.',
    questions: [
      {
        key: 'length',
        label: 'Preferred length',
        type: 'text',
        required: true,
        placeholder: 'Short, medium, long, or exact measurement',
      },
      {
        key: 'color',
        label: 'Preferred color',
        type: 'text',
        required: true,
        placeholder: 'Enter your preferred color',
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
  {
    slug: 'plushies',
    title: 'Plushies',
    image: 'assets/images/products/beanies.png',
    description:
      'Our crochet plushies can be made in different characters, sizes, and colors.',
    questions: [
      {
        key: 'character',
        label: 'What plushie would you like?',
        type: 'text',
        required: true,
        placeholder: 'Example: frog, bear, bunny',
      },
      {
        key: 'size',
        label: 'Preferred size',
        type: 'select',
        required: true,
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
        ],
      },
      {
        key: 'notes',
        label: 'Extra notes',
        type: 'textarea',
        placeholder: 'Any extra details or requests?',
      },
    ],
  },
];