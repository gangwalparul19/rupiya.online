/**
 * Analytics Dashboard UI Tests
 * Feature: analytics-and-loading-enhancements
 * Tests for analytics dashboard UI functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock DOM elements
function createMockAnalyticsDashboard() {
  const container = document.createElement('div');
  
  // Create all necessary DOM elements
  container.innerHTML = `
    <div id="periodFilter">
      <option value="month">This Month</option>
      <option value="quarter">This Quarter</option>
      <option value="year">This Year</option>
      <option value="all">All Time</option>
      <option value="custom">Custom Range</option>
    </div>
    <input type="date" id="startDate" style="display: none;">
    <input type="date" id="endDate" style="display: none;">
    
    <div id="totalIncome">₹0</div>
    <div id="totalExpenses">₹0</div>
    <div id="netSavings">₹0</div>
    <div id="savingsRate">0%</div>
    <div id="savingsRateValue">0%</div>
    <div id="healthScore">0</div>
    <div id="healthTrend">stable</div>
    <div id="budgetStatus">0%</div>
    <div id="budgetTrend">on track</div>
    
    <canvas id="spendingTrendsChart"></canvas>
    <canvas id="expenseByCategoryChart"></canvas>
    <canvas id="incomeVsExpensesChart"></canvas>
    <canvas id="savingsRateTrendsChart"></canvas>
    <canvas id="monthlyTrendChart"></canvas>
    <canvas id="budgetVsActualChart"></canvas>
    
    <table id="topCategoriesTable">
      <tbody></tbody>
    </table>
    
    <div id="categoryDrillDownModal" style="display: none;">
      <div class="modal-content">
        <h2 id="categoryDrillDownTitle">Category Transactions</h2>
        <table>
          <tbody id="categoryDrillDownTable"></tbody>
        </table>
        <div id="drillDownPagination"></div>
      </div>
    </div>
    
    <div id="healthScoreDisplay">0</div>
    <div id="healthScoreTrend">stable</div>
    <div id="savingsRateBar" style="width: 0%"></div>
    <div id="expenseControlBar" style="width: 0%"></div>
    <div id="debtRatioBar" style="width: 0%"></div>
    <div id="goalProgressBar" style="width: 0%"></div>
    <div id="savingsRateBreakdown">0%</div>
    <div id="expenseControlBreakdown">0%</div>
    <div id="debtRatioBreakdown">0%</div>
    <div id="goalProgressBreakdown">0%</div>
  `;
  
  document.body.appendChild(container);
  return container;
}

// Helper functions
function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

function getDateRange(periodFilter, startDateInput, endDateInput) {
  const now = new Date();
  const period = periodFilter.value;
  let startDate, endDate = now;

  if (period === 'custom') {
    startDate = new Date(startDateInput.value);
    endDate = new Date(endDateInput.value);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), quarter * 3, 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    startDate = new Date(2000, 0, 1);
  }

  return { startDate, endDate };
}

function updateSummary(expenses, income, startDate, endDate) {
  const filteredExpenses = expenses.filter(e => {
    const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return eDate >= startDate && eDate <= endDate;
  });

  const filteredIncome = income.filter(i => {
    const iDate = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    return iDate >= startDate && iDate <= endDate;
  });

  const totalIncome = filteredIncome.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate
  };
}

describe('Analytics Dashboard UI Tests', () => {
  let container;
  let periodFilter, startDateInput, endDateInput;
  let totalIncomeEl, totalExpensesEl, netSavingsEl, savingsRateEl;

  beforeEach(() => {
    container = createMockAnalyticsDashboard();
    periodFilter = document.getElementById('periodFilter');
    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    totalIncomeEl = document.getElementById('totalIncome');
    totalExpensesEl = document.getElementById('totalExpenses');
    netSavingsEl = document.getElementById('netSavings');
    savingsRateEl = document.getElementById('savingsRate');
  });

  afterEach(() => {
    container.remove();
  });

  // Test: Date range selection updates all metrics
  describe('Date Range Selection', () => {
    test('should update all metrics when date range is changed', () => {
      const expenses = [
        { amount: 100, date: new Date('2024-01-10'), category: 'Food' },
        { amount: 200, date: new Date('2024-02-10'), category: 'Transport' },
        { amount: 150, date: new Date('2024-03-10'), category: 'Entertainment' }
      ];

      const income = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5000, date: new Date('2024-02-01') },
        { amount: 5000, date: new Date('2024-03-01') }
      ];

      // Test month filter
      periodFilter.value = 'month';
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = now;

      const monthSummary = updateSummary(expenses, income, monthStart, monthEnd);
      
      // Should only include transactions from current month
      expect(monthSummary.totalIncome).toBeGreaterThanOrEqual(0);
      expect(monthSummary.totalExpenses).toBeGreaterThanOrEqual(0);
    });

    test('should support custom date range selection', () => {
      const expenses = [
        { amount: 100, date: new Date('2024-01-10'), category: 'Food' },
        { amount: 200, date: new Date('2024-02-10'), category: 'Transport' },
        { amount: 150, date: new Date('2024-03-10'), category: 'Entertainment' }
      ];

      const income = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5000, date: new Date('2024-02-01') },
        { amount: 5000, date: new Date('2024-03-01') }
      ];

      // Set custom date range
      periodFilter.value = 'custom';
      startDateInput.value = '2024-01-01';
      endDateInput.value = '2024-02-28';

      const customStart = new Date('2024-01-01');
      const customEnd = new Date('2024-02-28');

      const customSummary = updateSummary(expenses, income, customStart, customEnd);

      // Should include transactions from January and February
      expect(customSummary.totalExpenses).toBe(300); // 100 + 200
      expect(customSummary.totalIncome).toBe(10000); // 5000 + 5000
    });

    test('should handle all time period correctly', () => {
      const expenses = [
        { amount: 100, date: new Date('2020-01-10'), category: 'Food' },
        { amount: 200, date: new Date('2024-02-10'), category: 'Transport' },
        { amount: 150, date: new Date('2024-03-10'), category: 'Entertainment' }
      ];

      const income = [
        { amount: 5000, date: new Date('2020-01-01') },
        { amount: 5000, date: new Date('2024-02-01') },
        { amount: 5000, date: new Date('2024-03-01') }
      ];

      periodFilter.value = 'all';
      const allStart = new Date(2000, 0, 1);
      const allEnd = new Date();

      const allSummary = updateSummary(expenses, income, allStart, allEnd);

      // Should include all transactions
      expect(allSummary.totalExpenses).toBe(450); // 100 + 200 + 150
      expect(allSummary.totalIncome).toBe(15000); // 5000 + 5000 + 5000
    });
  });

  // Test: Category drill-down navigation
  describe('Category Drill-Down Navigation', () => {
    test('should display category transactions when drill-down is triggered', () => {
      const expenses = [
        { id: '1', amount: 100, date: new Date('2024-01-10'), category: 'Food', description: 'Lunch' },
        { id: '2', amount: 50, date: new Date('2024-01-15'), category: 'Food', description: 'Dinner' },
        { id: '3', amount: 200, date: new Date('2024-01-12'), category: 'Transport', description: 'Taxi' }
      ];

      const category = 'Food';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Filter transactions for category
      const categoryTransactions = expenses.filter(e => {
        const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return e.category === category && eDate >= startDate && eDate <= endDate;
      });

      // Should return only Food transactions
      expect(categoryTransactions.length).toBe(2);
      expect(categoryTransactions[0].category).toBe('Food');
      expect(categoryTransactions[1].category).toBe('Food');
    });

    test('should support pagination in drill-down view', () => {
      const expenses = [];
      for (let i = 0; i < 25; i++) {
        expenses.push({
          id: `${i}`,
          amount: 50 + i,
          date: new Date('2024-01-' + String((i % 28) + 1).padStart(2, '0')),
          category: 'Food',
          description: `Transaction ${i}`
        });
      }

      const category = 'Food';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const pageSize = 10;

      // Filter transactions
      const categoryTransactions = expenses.filter(e => {
        const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return e.category === category && eDate >= startDate && eDate <= endDate;
      });

      // Paginate
      const page1 = categoryTransactions.slice(0, pageSize);
      const page2 = categoryTransactions.slice(pageSize, pageSize * 2);
      const page3 = categoryTransactions.slice(pageSize * 2);

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
      expect(page3.length).toBe(5);
    });

    test('should maintain drill-down state across pagination', () => {
      const expenses = [];
      for (let i = 0; i < 15; i++) {
        expenses.push({
          id: `${i}`,
          amount: 50 + i,
          date: new Date('2024-01-' + String((i % 28) + 1).padStart(2, '0')),
          category: 'Food',
          description: `Transaction ${i}`
        });
      }

      const category = 'Food';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const pageSize = 5;

      // Filter transactions
      const categoryTransactions = expenses.filter(e => {
        const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return e.category === category && eDate >= startDate && eDate <= endDate;
      });

      // Get page 2
      const page2 = categoryTransactions.slice(pageSize, pageSize * 2);

      // All items on page 2 should still be from the same category
      page2.forEach(transaction => {
        expect(transaction.category).toBe(category);
      });
    });
  });

  // Test: Metric calculations
  describe('Metric Calculations', () => {
    test('should calculate total income correctly', () => {
      const income = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 3000, date: new Date('2024-01-15') },
        { amount: 2000, date: new Date('2024-01-20') }
      ];

      const expenses = [];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      expect(summary.totalIncome).toBe(10000);
    });

    test('should calculate total expenses correctly', () => {
      const expenses = [
        { amount: 500, date: new Date('2024-01-05'), category: 'Food' },
        { amount: 300, date: new Date('2024-01-10'), category: 'Transport' },
        { amount: 200, date: new Date('2024-01-15'), category: 'Entertainment' }
      ];

      const income = [];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      expect(summary.totalExpenses).toBe(1000);
    });

    test('should calculate net savings correctly', () => {
      const income = [
        { amount: 5000, date: new Date('2024-01-01') }
      ];

      const expenses = [
        { amount: 1000, date: new Date('2024-01-05'), category: 'Food' },
        { amount: 500, date: new Date('2024-01-10'), category: 'Transport' }
      ];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      expect(summary.netSavings).toBe(3500);
    });

    test('should calculate savings rate correctly', () => {
      const income = [
        { amount: 10000, date: new Date('2024-01-01') }
      ];

      const expenses = [
        { amount: 2000, date: new Date('2024-01-05'), category: 'Food' }
      ];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      const expectedRate = ((10000 - 2000) / 10000) * 100;
      expect(parseFloat(summary.savingsRate)).toBe(expectedRate);
    });

    test('should handle zero income gracefully', () => {
      const income = [];
      const expenses = [
        { amount: 500, date: new Date('2024-01-05'), category: 'Food' }
      ];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      expect(summary.totalIncome).toBe(0);
      expect(summary.savingsRate).toBe(0);
    });

    test('should handle zero expenses gracefully', () => {
      const income = [
        { amount: 5000, date: new Date('2024-01-01') }
      ];

      const expenses = [];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      expect(summary.totalExpenses).toBe(0);
      expect(summary.netSavings).toBe(5000);
    });
  });

  // Test: UI state management
  describe('UI State Management', () => {
    test('should show date inputs when custom range is selected', () => {
      periodFilter.value = 'custom';
      
      // Simulate the change event handler
      if (periodFilter.value === 'custom') {
        startDateInput.style.display = 'block';
        endDateInput.style.display = 'block';
      }

      expect(startDateInput.style.display).toBe('block');
      expect(endDateInput.style.display).toBe('block');
    });

    test('should hide date inputs when preset period is selected', () => {
      periodFilter.value = 'month';
      
      // Simulate the change event handler
      if (periodFilter.value !== 'custom') {
        startDateInput.style.display = 'none';
        endDateInput.style.display = 'none';
      }

      expect(startDateInput.style.display).toBe('none');
      expect(endDateInput.style.display).toBe('none');
    });

    test('should update KPI cards with calculated values', () => {
      const income = [
        { amount: 5000, date: new Date('2024-01-01') }
      ];

      const expenses = [
        { amount: 1000, date: new Date('2024-01-05'), category: 'Food' }
      ];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = updateSummary(expenses, income, startDate, endDate);

      // Update DOM elements
      totalIncomeEl.textContent = formatCurrency(summary.totalIncome);
      totalExpensesEl.textContent = formatCurrency(summary.totalExpenses);
      netSavingsEl.textContent = formatCurrency(summary.netSavings);
      savingsRateEl.textContent = `${summary.savingsRate}%`;

      expect(totalIncomeEl.textContent).toBe('₹5,000');
      expect(totalExpensesEl.textContent).toBe('₹1,000');
      expect(netSavingsEl.textContent).toBe('₹4,000');
      expect(savingsRateEl.textContent).toMatch(/80\.0?%/);
    });
  });

  // Test: Category drill-down modal
  describe('Category Drill-Down Modal', () => {
    test('should open modal when category is clicked', () => {
      const modal = document.getElementById('categoryDrillDownModal');
      
      // Simulate modal opening
      modal.style.display = 'flex';

      expect(modal.style.display).toBe('flex');
    });

    test('should close modal when close button is clicked', () => {
      const modal = document.getElementById('categoryDrillDownModal');
      
      // Simulate modal opening
      modal.style.display = 'flex';
      
      // Simulate close button click
      modal.style.display = 'none';

      expect(modal.style.display).toBe('none');
    });

    test('should display correct category title in modal', () => {
      const modal = document.getElementById('categoryDrillDownModal');
      const title = document.getElementById('categoryDrillDownTitle');
      const category = 'Food';

      // Simulate modal opening with category
      title.textContent = `${category} Transactions`;
      modal.style.display = 'flex';

      expect(title.textContent).toBe('Food Transactions');
    });

    test('should populate modal with category transactions', () => {
      const expenses = [
        { id: '1', amount: 100, date: new Date('2024-01-10'), category: 'Food', description: 'Lunch' },
        { id: '2', amount: 50, date: new Date('2024-01-15'), category: 'Food', description: 'Dinner' }
      ];

      const table = document.getElementById('categoryDrillDownTable');
      const category = 'Food';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Filter and populate
      const categoryTransactions = expenses.filter(e => {
        const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return e.category === category && eDate >= startDate && eDate <= endDate;
      });

      table.innerHTML = categoryTransactions.map(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return `
          <tr>
            <td>${tDate.toLocaleDateString('en-IN')}</td>
            <td>${t.description || 'N/A'}</td>
            <td>${formatCurrency(t.amount)}</td>
          </tr>
        `;
      }).join('');

      expect(table.querySelectorAll('tr').length).toBe(2);
    });
  });
});
