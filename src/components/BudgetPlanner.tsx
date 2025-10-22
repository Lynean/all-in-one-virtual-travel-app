import React, { useState } from 'react';
import { DollarSign, Plus, TrendingDown, TrendingUp, Wallet, Calendar, Settings, X, PieChart } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useStore } from '../store/useStore';
import { CategoryManager } from './CategoryManager';

export const BudgetPlanner: React.FC = () => {
  const {
    startingBudget,
    setStartingBudget,
    categories,
    getCategoryById,
    expenses,
    addExpense,
    deleteExpense,
    clearBudget,
  } = useStore();

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [budgetInput, setBudgetInput] = useState(startingBudget.toString());
  
  // Expense form state
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate totals
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = startingBudget - totalSpent;
  const budgetProgress = startingBudget > 0 ? (totalSpent / startingBudget) * 100 : 0;

  // Calculate category spending
  const categorySpending = expenses.reduce((acc, expense) => {
    acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleSetBudget = () => {
    const amount = parseFloat(budgetInput);
    if (!isNaN(amount) && amount > 0) {
      setStartingBudget(amount);
      setShowEditBudgetModal(false);
    }
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseDescription.trim() || isNaN(amount) || amount <= 0 || !expenseCategoryId) {
      return;
    }

    addExpense({
      description: expenseDescription.trim(),
      amount,
      categoryId: expenseCategoryId,
      date: expenseDate,
    });

    // Reset form
    setExpenseDescription('');
    setExpenseAmount('');
    setExpenseCategoryId('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowAddExpenseModal(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  // Initial budget setup screen
  if (startingBudget === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-lg">
            <Wallet className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Set Your Travel Budget</h3>
          <p className="text-gray-600 mb-6">
            Start by entering your total budget for this trip to track your expenses effectively.
          </p>
          
          <div className="space-y-4">
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Enter your budget"
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors text-lg font-semibold"
                autoFocus
              />
            </div>
            <button
              onClick={handleSetBudget}
              disabled={!budgetInput || parseFloat(budgetInput) <= 0}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set Budget & Start Planning
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No categories created yet
  if (categories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <PieChart className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Category</h3>
          <p className="text-gray-600 mb-6">
            Organize your budget by creating custom categories like Accommodation, Food, Transportation, and more.
          </p>
          
          <button
            onClick={() => setShowCategoryManager(true)}
            className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Create Categories
          </button>
        </div>

        {showCategoryManager && (
          <CategoryManager onClose={() => setShowCategoryManager(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Budget Overview Card */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Budget Overview</h2>
                <p className="text-sm text-gray-500 mt-1">Track your travel expenses</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCategoryManager(true)}
                className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 font-medium transition-all hover:scale-105 shadow-md flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Categories
              </button>
              <button
                onClick={() => {
                  if (categories.length > 0) {
                    setExpenseCategoryId(categories[0].id);
                  }
                  setShowAddExpenseModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all hover:scale-105 shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
              <button
                onClick={() => setShowEditBudgetModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium transition-all hover:scale-105 shadow-md"
              >
                Edit Budget
              </button>
            </div>
          </div>

          {/* Budget Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Starting Budget</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(startingBudget)}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Total Allocated</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{formatCurrency(totalAllocated)}</div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Total Spent</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{formatCurrency(totalSpent)}</div>
            </div>

            <div className={`bg-gradient-to-br rounded-2xl p-4 ${
              remainingBudget >= 0 ? 'from-green-50 to-green-100' : 'from-red-50 to-red-100'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-sm font-medium ${remainingBudget >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  Remaining
                </span>
              </div>
              <div className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(remainingBudget)}
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Budget Usage</span>
              <span className={`font-bold ${budgetProgress > 100 ? 'text-red-600' : 'text-green-600'}`}>
                {budgetProgress.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  budgetProgress > 100 
                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600'
                }`}
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              ></div>
            </div>
            {budgetProgress > 90 && (
              <p className={`text-xs ${budgetProgress > 100 ? 'text-red-600' : 'text-orange-600'} font-medium`}>
                {budgetProgress > 100 ? '⚠️ Over budget!' : '⚠️ Approaching budget limit'}
              </p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const spent = categorySpending[category.id] || 0;
              const remaining = category.allocated - spent;
              const progress = category.allocated > 0 ? (spent / category.allocated) * 100 : 0;

              return (
                <div key={category.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: category.color }}
                      >
                        <div className="text-white">
                          {getIconComponent(category.icon)}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 block">{category.name}</span>
                        {category.description && (
                          <span className="text-xs text-gray-500">{category.description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Allocated:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(category.allocated)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Spent:</span>
                      <span className="font-semibold text-red-600">{formatCurrency(spent)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className={`font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(remaining)}
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
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Recent Expenses</h3>
            {expenses.length > 0 && (
              <button
                onClick={clearBudget}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm"
              >
                Clear All
              </button>
            )}
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-4">
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No expenses recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Expense" to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => {
                  const category = getCategoryById(expense.categoryId);
                  
                  return (
                    <div
                      key={expense.id}
                      className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {category && (
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: category.color }}
                          >
                            <div className="text-white">
                              {getIconComponent(category.icon)}
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{expense.description}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(expense.date).toLocaleDateString()}
                            </span>
                            {category && (
                              <span className="text-sm text-gray-500">
                                {category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold text-red-600">
                          {formatCurrency(expense.amount)}
                        </div>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Add Expense</h3>
              <button
                onClick={() => {
                  setShowAddExpenseModal(false);
                  setExpenseDescription('');
                  setExpenseAmount('');
                  setExpenseCategoryId('');
                  setExpenseDate(new Date().toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="e.g., Hotel booking"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={expenseCategoryId}
                  onChange={(e) => setExpenseCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddExpenseModal(false);
                  setExpenseDescription('');
                  setExpenseAmount('');
                  setExpenseCategoryId('');
                  setExpenseDate(new Date().toISOString().split('T')[0]);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                disabled={!expenseDescription.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0 || !expenseCategoryId}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {showEditBudgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Edit Budget</h3>
              <button
                onClick={() => {
                  setShowEditBudgetModal(false);
                  setBudgetInput(startingBudget.toString());
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Starting Budget</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="Enter your budget"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors text-lg font-semibold"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowEditBudgetModal(false);
                  setBudgetInput(startingBudget.toString());
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSetBudget}
                disabled={!budgetInput || parseFloat(budgetInput) <= 0}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Update Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  );
};
