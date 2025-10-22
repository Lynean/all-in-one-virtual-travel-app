import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useStore } from '../store/useStore';
import { CategoryFormData, CATEGORY_COLORS, CATEGORY_ICONS } from '../types/budget';
import { validateCategoryForm, canDeleteCategory } from '../utils/categoryValidation';

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory, expenses, reassignExpenses } = useStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: CATEGORY_COLORS[0].value,
    icon: CATEGORY_ICONS[0],
    allocated: 0,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: CATEGORY_COLORS[0].value,
      icon: CATEGORY_ICONS[0],
      allocated: 0,
    });
    setErrors([]);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    const validationErrors = validateCategoryForm(
      formData,
      categories,
      editingId || undefined
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }

    if (editingId) {
      updateCategory(editingId, formData);
    } else {
      addCategory(formData);
    }

    resetForm();
  };

  const handleEdit = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      setFormData({
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        allocated: category.allocated,
      });
      setEditingId(categoryId);
      setIsCreating(true);
    }
  };

  const handleDelete = (categoryId: string) => {
    const { canDelete, expenseCount } = canDeleteCategory(categoryId, expenses);

    if (canDelete) {
      deleteCategory(categoryId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(categoryId);
    }
  };

  const handleReassignAndDelete = (categoryId: string) => {
    if (reassignTarget && reassignTarget !== categoryId) {
      reassignExpenses(categoryId, reassignTarget);
      deleteCategory(categoryId);
      setDeleteConfirm(null);
      setReassignTarget('');
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create and organize your budget categories
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create/Edit Form */}
          {isCreating ? (
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Category' : 'Create New Category'}
              </h3>

              {errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Accommodation, Food & Dining"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                    maxLength={30}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.name.length}/30 characters
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`h-12 rounded-xl transition-all ${
                          formData.color === color.value
                            ? 'ring-4 ring-offset-2 ring-green-500 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon *
                  </label>
                  <div className="grid grid-cols-10 gap-2">
                    {CATEGORY_ICONS.map((iconName) => {
                      const IconComponent = (Icons as any)[iconName];
                      return (
                        <button
                          key={iconName}
                          onClick={() => setFormData({ ...formData, icon: iconName })}
                          className={`h-12 rounded-xl flex items-center justify-center transition-all ${
                            formData.icon === iconName
                              ? 'bg-green-100 ring-2 ring-green-500 scale-110'
                              : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                          }`}
                        >
                          {IconComponent && <IconComponent className="w-5 h-5 text-gray-700" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allocated Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allocated Budget
                  </label>
                  <input
                    type="number"
                    value={formData.allocated}
                    onChange={(e) =>
                      setFormData({ ...formData, allocated: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all shadow-lg hover:shadow-xl"
                >
                  {editingId ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mb-6 px-6 py-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 text-gray-600 hover:text-green-600 font-medium transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Category
            </button>
          )}

          {/* Category List */}
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-4">
                <Icons.FolderOpen className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No categories yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create your first category to start organizing your budget
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => {
                const categoryExpenses = expenses.filter((exp) => exp.categoryId === category.id);
                const totalSpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const remaining = category.allocated - totalSpent;
                const progress = category.allocated > 0 ? (totalSpent / category.allocated) * 100 : 0;

                return (
                  <div
                    key={category.id}
                    className="bg-gray-50 rounded-2xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: category.color }}
                        >
                          {getIconComponent(category.icon) && (
                            <div className="text-white">
                              {getIconComponent(category.icon)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-600">
                              Allocated: <span className="font-semibold">{formatCurrency(category.allocated)}</span>
                            </span>
                            <span className="text-red-600">
                              Spent: <span className="font-semibold">{formatCurrency(totalSpent)}</span>
                            </span>
                            <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Remaining: <span className="font-semibold">{formatCurrency(remaining)}</span>
                            </span>
                          </div>
                          {category.allocated > 0 && (
                            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                  progress > 100
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(category.id)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit category"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {categoryExpenses.length > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        {categoryExpenses.length} expense{categoryExpenses.length !== 1 ? 's' : ''} in this category
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cannot Delete Category</h3>
              <p className="text-gray-600 mb-4">
                This category has {canDeleteCategory(deleteConfirm, expenses).expenseCount} expense(s) assigned to it.
                Please reassign these expenses to another category before deleting.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reassign expenses to:
                </label>
                <select
                  value={reassignTarget}
                  onChange={(e) => setReassignTarget(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                >
                  <option value="">Select a category...</option>
                  {categories
                    .filter((cat) => cat.id !== deleteConfirm)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirm(null);
                    setReassignTarget('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReassignAndDelete(deleteConfirm)}
                  disabled={!reassignTarget}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reassign & Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
