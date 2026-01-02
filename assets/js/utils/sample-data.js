// Sample Data Generator for Testing
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';

// Sample expense categories
const expenseCategories = [
  'Groceries',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Dining',
  'Education'
];

// Sample income sources
const incomeSources = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Rental'
];

// Generate random amount
function randomAmount(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random date in last N months
function randomDate(monthsBack) {
  const now = new Date();
  const randomMonths = Math.floor(Math.random() * monthsBack);
  const randomDays = Math.floor(Math.random() * 28);
  return new Date(now.getFullYear(), now.getMonth() - randomMonths, randomDays + 1);
}

// Generate sample expenses
export async function generateSampleExpenses(count = 50) {
  try {
    const expenses = [];
    
    for (let i = 0; i < count; i++) {
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const expense = {
        amount: randomAmount(500, 10000),
        category: category,
        description: `Sample ${category.toLowerCase()} expense`,
        date: randomDate(6),
        paymentMethod: ['Cash', 'Card', 'UPI'][Math.floor(Math.random() * 3)]
      };
      
      await firestoreService.addExpense(expense);
      expenses.push(expense);
    }
    
    return { success: true, count: expenses.length };
  } catch (error) {
    console.error('Error generating sample expenses:', error);
    return { success: false, error: error.message };
  }
}

// Generate sample income
export async function generateSampleIncome(count = 20) {
  try {
    const incomes = [];
    
    for (let i = 0; i < count; i++) {
      const source = incomeSources[Math.floor(Math.random() * incomeSources.length)];
      const income = {
        amount: randomAmount(10000, 100000),
        source: source,
        description: `Sample ${source.toLowerCase()} income`,
        date: randomDate(6)
      };
      
      await firestoreService.addIncome(income);
      incomes.push(income);
    }
    
    return { success: true, count: incomes.length };
  } catch (error) {
    console.error('Error generating sample income:', error);
    return { success: false, error: error.message };
  }
}

// Generate all sample data
export async function generateAllSampleData() {
  toast.info('Generating sample data... This may take a moment.');
  
  try {
    const [expenseResult, incomeResult] = await Promise.all([
      generateSampleExpenses(50),
      generateSampleIncome(20)
    ]);
    
    if (expenseResult.success && incomeResult.success) {
      toast.success(`Generated ${expenseResult.count} expenses and ${incomeResult.count} income entries!`);
      return { success: true };
    } else {
      toast.error('Failed to generate some sample data');
      return { success: false };
    }
  } catch (error) {
    console.error('Error generating sample data:', error);
    toast.error('Failed to generate sample data');
    return { success: false, error: error.message };
  }
}

// Clear all data
export async function clearAllData() {
  const confirmed = confirm('Are you sure you want to delete ALL expenses and income? This cannot be undone!');
  if (!confirmed) return { success: false, cancelled: true };
  
  try {
    toast.info('Clearing all data...');
    
    // Get all expenses and income
    const [expenses, income] = await Promise.all([
      firestoreService.getExpenses(),
      firestoreService.getIncome()
    ]);
    
    // Delete all
    const deletePromises = [
      ...expenses.map(e => firestoreService.deleteExpense(e.id)),
      ...income.map(i => firestoreService.deleteIncome(i.id))
    ];
    
    await Promise.all(deletePromises);
    
    toast.success('All data cleared successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error clearing data:', error);
    toast.error('Failed to clear data');
    return { success: false, error: error.message };
  }
}
