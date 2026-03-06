export interface OrderQuestionOption {
  label: string;
  value: string;
}

export interface OrderQuestion {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: OrderQuestionOption[];
}

export interface OrderCategory {
  slug: string;
  title: string;
  image: string;
  description: string;
  questions: OrderQuestion[];
}