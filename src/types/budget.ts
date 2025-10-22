// Budget and Category Type Definitions

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color code
  icon: string; // Icon identifier (lucide-react icon name)
  allocated: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: string; // Reference to Category.id
  date: string;
  createdAt: string;
}

export interface BudgetState {
  startingBudget: number;
  categories: Category[];
  expenses: Expense[];
}

export interface CategoryFormData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  allocated: number;
}

export interface CategoryValidationError {
  field: 'name' | 'color' | 'icon' | 'allocated';
  message: string;
}

// Predefined color palette for user selection
export const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Rose', value: '#F43F5E' },
] as const;

// Available icons for categories (lucide-react icons)
export const CATEGORY_ICONS = [
  'Home',
  'Car',
  'Utensils',
  'Zap',
  'Film',
  'Heart',
  'User',
  'PiggyBank',
  'ShoppingBag',
  'Plane',
  'Coffee',
  'Book',
  'Dumbbell',
  'Smartphone',
  'Gift',
  'Briefcase',
  'GraduationCap',
  'Stethoscope',
  'Shirt',
  'Gamepad2',
] as const;

export type CategoryIconName = typeof CATEGORY_ICONS[number];
