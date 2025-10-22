import { CategoryFormData, CategoryValidationError } from '../types/budget';

export const validateCategoryName = (
  name: string,
  existingCategories: Array<{ id: string; name: string }>,
  currentCategoryId?: string
): CategoryValidationError | null => {
  // Check if empty
  if (!name.trim()) {
    return {
      field: 'name',
      message: 'Category name is required',
    };
  }

  // Check length constraints
  if (name.length < 2) {
    return {
      field: 'name',
      message: 'Category name must be at least 2 characters',
    };
  }

  if (name.length > 30) {
    return {
      field: 'name',
      message: 'Category name must not exceed 30 characters',
    };
  }

  // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
  const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNamePattern.test(name)) {
    return {
      field: 'name',
      message: 'Category name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  // Check for duplicates (case-insensitive)
  const isDuplicate = existingCategories.some(
    (cat) =>
      cat.name.toLowerCase() === name.toLowerCase() &&
      cat.id !== currentCategoryId
  );

  if (isDuplicate) {
    return {
      field: 'name',
      message: 'A category with this name already exists',
    };
  }

  return null;
};

export const validateCategoryForm = (
  formData: CategoryFormData,
  existingCategories: Array<{ id: string; name: string }>,
  currentCategoryId?: string
): CategoryValidationError[] => {
  const errors: CategoryValidationError[] = [];

  // Validate name
  const nameError = validateCategoryName(
    formData.name,
    existingCategories,
    currentCategoryId
  );
  if (nameError) {
    errors.push(nameError);
  }

  // Validate color
  if (!formData.color || !/^#[0-9A-F]{6}$/i.test(formData.color)) {
    errors.push({
      field: 'color',
      message: 'Please select a valid color',
    });
  }

  // Validate icon
  if (!formData.icon || formData.icon.trim() === '') {
    errors.push({
      field: 'icon',
      message: 'Please select an icon',
    });
  }

  // Validate allocated amount
  if (formData.allocated < 0) {
    errors.push({
      field: 'allocated',
      message: 'Allocated amount cannot be negative',
    });
  }

  return errors;
};

export const canDeleteCategory = (
  categoryId: string,
  expenses: Array<{ categoryId: string }>
): { canDelete: boolean; expenseCount: number } => {
  const expenseCount = expenses.filter((exp) => exp.categoryId === categoryId).length;
  
  return {
    canDelete: expenseCount === 0,
    expenseCount,
  };
};
