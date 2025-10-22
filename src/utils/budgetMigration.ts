import { Category, Expense } from '../types/budget';

// Legacy category names from the old system
const LEGACY_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Personal',
  'Savings',
  'Other',
] as const;

type LegacyCategory = typeof LEGACY_CATEGORIES[number];

// Default color and icon mappings for legacy categories
const LEGACY_CATEGORY_DEFAULTS: Record<
  LegacyCategory,
  { color: string; icon: string }
> = {
  Housing: { color: '#3B82F6', icon: 'Home' },
  Transportation: { color: '#10B981', icon: 'Car' },
  Food: { color: '#F97316', icon: 'Utensils' },
  Utilities: { color: '#8B5CF6', icon: 'Zap' },
  Entertainment: { color: '#EC4899', icon: 'Film' },
  Healthcare: { color: '#EF4444', icon: 'Heart' },
  Personal: { color: '#06B6D4', icon: 'User' },
  Savings: { color: '#059669', icon: 'PiggyBank' },
  Other: { color: '#6B7280', icon: 'ShoppingBag' },
};

interface LegacyExpense {
  id: string;
  description: string;
  amount: number;
  category: string; // Old string-based category
  date: string;
}

interface LegacyCategoryAllocation {
  [category: string]: number;
}

export const migrateLegacyData = (
  legacyExpenses: LegacyExpense[],
  legacyAllocations: LegacyCategoryAllocation
): { categories: Category[]; expenses: Expense[] } => {
  const now = new Date().toISOString();
  const categoryMap = new Map<string, Category>();

  // Create categories from legacy allocations and expenses
  const allLegacyCategories = new Set<string>([
    ...Object.keys(legacyAllocations),
    ...legacyExpenses.map((exp) => exp.category),
  ]);

  allLegacyCategories.forEach((legacyCategoryName) => {
    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const defaults = LEGACY_CATEGORY_DEFAULTS[legacyCategoryName as LegacyCategory] || {
      color: '#6B7280',
      icon: 'ShoppingBag',
    };

    const category: Category = {
      id: categoryId,
      name: legacyCategoryName,
      description: `Migrated from legacy system`,
      color: defaults.color,
      icon: defaults.icon,
      allocated: legacyAllocations[legacyCategoryName] || 0,
      createdAt: now,
      updatedAt: now,
    };

    categoryMap.set(legacyCategoryName, category);
  });

  // Migrate expenses to use category IDs
  const migratedExpenses: Expense[] = legacyExpenses.map((legacyExp) => {
    const category = categoryMap.get(legacyExp.category);
    
    return {
      id: legacyExp.id,
      description: legacyExp.description,
      amount: legacyExp.amount,
      categoryId: category?.id || 'unknown',
      date: legacyExp.date,
      createdAt: now,
    };
  });

  return {
    categories: Array.from(categoryMap.values()),
    expenses: migratedExpenses,
  };
};

export const needsMigration = (storageData: any): boolean => {
  // Check if data is in legacy format
  if (!storageData) return false;

  // Legacy format has categoryAllocations object and expenses with string category
  const hasLegacyAllocations = storageData.categoryAllocations && 
    typeof storageData.categoryAllocations === 'object';
  
  const hasLegacyExpenses = storageData.expenses && 
    Array.isArray(storageData.expenses) &&
    storageData.expenses.length > 0 &&
    typeof storageData.expenses[0]?.category === 'string';

  return hasLegacyAllocations || hasLegacyExpenses;
};
