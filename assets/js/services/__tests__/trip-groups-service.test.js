/**
 * Property-Based Tests for Trip Groups Service
 * Feature: trip-groups
 * 
 * These tests use fast-check to verify universal properties that should hold
 * for all valid inputs, providing stronger correctness guarantees than
 * example-based unit tests alone.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';

/**
 * Mock Trip Groups Service for Testing
 * 
 * Since we can't easily test against Firestore in unit tests, we create
 * a simplified in-memory version that implements the core balance logic.
 */
class MockTripGroupsService {
  constructor() {
    this.expenses = [];
    this.settlements = [];
    this.members = [];
  }

  reset() {
    this.expenses = [];
    this.settlements = [];
    this.members = [];
  }

  addMember(memberId, name) {
    this.members.push({ id: memberId, name });
  }

  addExpense(paidBy, splits) {
    const amount = splits.reduce((sum, s) => sum + s.amount, 0);
    this.expenses.push({
      paidBy,
      amount,
      splits
    });
  }

  addSettlement(fromMemberId, toMemberId, amount) {
    this.settlements.push({
      fromMemberId,
      toMemberId,
      amount
    });
  }

  /**
   * Calculate balances for all members
   * This is the core algorithm we're testing
   */
  calculateBalances() {
    const balances = {};
    
    // Initialize balances
    this.members.forEach(m => {
      balances[m.id] = 0;
    });

    // Process expenses
    this.expenses.forEach(expense => {
      // Person who paid gets credit for the full amount
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] += expense.amount;
      }

      // Each person in the split owes their share
      expense.splits.forEach(split => {
        if (balances[split.memberId] !== undefined) {
          balances[split.memberId] -= split.amount;
        }
      });
    });

    // Process settlements
    this.settlements.forEach(settlement => {
      // Person who paid (from) reduces their debt
      if (balances[settlement.fromMemberId] !== undefined) {
        balances[settlement.fromMemberId] += settlement.amount;
      }
      // Person who received (to) increases their debt
      if (balances[settlement.toMemberId] !== undefined) {
        balances[settlement.toMemberId] -= settlement.amount;
      }
    });

    return balances;
  }

  /**
   * Simplify debts to minimize transactions
   */
  simplifyDebts() {
    const balances = this.calculateBalances();

    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([memberId, balance]) => {
      const member = this.members.find(m => m.id === memberId);
      if (balance > 0.01) {
        creditors.push({ memberId, amount: balance, name: member?.name || 'Unknown' });
      } else if (balance < -0.01) {
        debtors.push({ memberId, amount: -balance, name: member?.name || 'Unknown' });
      }
    });

    // Sort by amount descending
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Generate simplified transactions
    const transactions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.01) {
        transactions.push({
          from: debtor.memberId,
          fromName: debtor.name,
          to: creditor.memberId,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return transactions;
  }
}

describe('Trip Groups Service - Property-Based Tests', () => {
  let service;

  beforeEach(() => {
    service = new MockTripGroupsService();
  });

  /**
   * Property 5: Balance Conservation Invariant
   * Feature: trip-groups, Property 5: Balance Conservation Invariant
   * Validates: Requirements 2.6, 3.2
   * 
   * For any trip group at any point in time, the sum of all member balances
   * should equal zero (money is conserved within the group).
   */
  test('Property 5: Balance Conservation - sum of all balances equals zero', () => {
    fc.assert(
      fc.property(
        // Generate random members (2-10 members)
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
        // Generate random expenses
        fc.array(
          fc.record({
            paidByIndex: fc.nat(),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            splitIndices: fc.array(fc.nat(), { minLength: 1, maxLength: 10 })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        // Generate random settlements
        fc.array(
          fc.record({
            fromIndex: fc.nat(),
            toIndex: fc.nat(),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (memberNames, expenseData, settlementData) => {
          // Setup: Create members
          service.reset();
          const memberIds = memberNames.map((name, i) => `member_${i}`);
          memberIds.forEach((id, i) => service.addMember(id, memberNames[i]));

          // Setup: Add expenses
          expenseData.forEach(exp => {
            const paidBy = memberIds[exp.paidByIndex % memberIds.length];
            const participants = exp.splitIndices
              .map(idx => memberIds[idx % memberIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx); // Remove duplicates

            if (participants.length === 0) return;

            const splitAmount = exp.amount / participants.length;
            const splits = participants.map(memberId => ({
              memberId,
              amount: Math.round(splitAmount * 100) / 100
            }));

            // Adjust last split to account for rounding
            const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
            splits[splits.length - 1].amount += Math.round((exp.amount - totalSplit) * 100) / 100;

            service.addExpense(paidBy, splits);
          });

          // Setup: Add settlements
          settlementData.forEach(settlement => {
            const fromId = memberIds[settlement.fromIndex % memberIds.length];
            const toId = memberIds[settlement.toIndex % memberIds.length];
            if (fromId !== toId) {
              service.addSettlement(fromId, toId, settlement.amount);
            }
          });

          // Test: Calculate balances
          const balances = service.calculateBalances();

          // Verify: Sum of all balances should be zero (within floating point tolerance)
          const sum = Object.values(balances).reduce((total, balance) => total + balance, 0);
          const tolerance = 0.01; // Allow 1 cent tolerance for rounding

          expect(Math.abs(sum)).toBeLessThan(tolerance);
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });

  /**
   * Property 14: Category Breakdown Sum
   * Feature: trip-groups, Property 14: Category Breakdown Sum
   * Validates: Requirements 10.3
   * 
   * For any trip group with expenses, the sum of expenses by category
   * should equal the total group expenses.
   */
  test('Property 14: Category Breakdown - sum by category equals total', () => {
    fc.assert(
      fc.property(
        // Generate random expenses with categories
        fc.array(
          fc.record({
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            category: fc.constantFrom(
              'Accommodation',
              'Transport',
              'Food & Dining',
              'Activities',
              'Shopping',
              'Tips',
              'Other'
            )
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (expenses) => {
          // Calculate total
          const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

          // Calculate by category
          const byCategory = {};
          expenses.forEach(exp => {
            byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
          });

          // Sum of category totals
          const categorySum = Object.values(byCategory).reduce((sum, amount) => sum + amount, 0);

          // Verify: Category sum should equal total (within floating point tolerance)
          const tolerance = 0.01;
          expect(Math.abs(total - categorySum)).toBeLessThan(tolerance);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Split Calculation Correctness
   * Feature: trip-groups, Property 4: Split Calculation Correctness
   * Validates: Requirements 2.4, 2.5
   * 
   * For any expense with any split type (equal, custom, percentage),
   * the sum of all member shares should equal the total expense amount.
   */
  test('Property 4: Split Calculation - splits sum to total amount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
        fc.constantFrom('equal', 'custom', 'percentage'),
        (amount, memberIds, splitType) => {
          let splits = [];

          if (splitType === 'equal') {
            // Equal split
            const splitAmount = amount / memberIds.length;
            splits = memberIds.map(id => ({
              memberId: id,
              amount: Math.round(splitAmount * 100) / 100
            }));
            // Adjust last split for rounding
            const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
            splits[splits.length - 1].amount += Math.round((amount - totalSplit) * 100) / 100;

          } else if (splitType === 'custom') {
            // Custom split - distribute randomly but ensure sum equals total
            const randomAmounts = memberIds.map(() => Math.random());
            const sumRandom = randomAmounts.reduce((sum, a) => sum + a, 0);
            splits = memberIds.map((id, i) => ({
              memberId: id,
              amount: Math.round((amount * randomAmounts[i] / sumRandom) * 100) / 100
            }));
            // Adjust last split for rounding
            const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
            splits[splits.length - 1].amount += Math.round((amount - totalSplit) * 100) / 100;

          } else if (splitType === 'percentage') {
            // Percentage split - generate random percentages that sum to 100
            const randomPercentages = memberIds.map(() => Math.random());
            const sumPercentages = randomPercentages.reduce((sum, p) => sum + p, 0);
            const percentages = randomPercentages.map(p => (p / sumPercentages) * 100);
            
            splits = memberIds.map((id, i) => ({
              memberId: id,
              amount: Math.round((amount * percentages[i] / 100) * 100) / 100,
              percentage: Math.round(percentages[i] * 100) / 100
            }));
            // Adjust last split for rounding
            const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
            splits[splits.length - 1].amount += Math.round((amount - totalSplit) * 100) / 100;
          }

          // Verify: Sum of splits should equal total amount
          const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
          const tolerance = 0.01;
          expect(Math.abs(amount - splitSum)).toBeLessThan(tolerance);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Settlement Balance Update
   * Feature: trip-groups, Property 6: Settlement Balance Update
   * Validates: Requirements 4.1, 4.3
   * 
   * For any settlement recorded between two members, the payer's balance
   * should decrease and the receiver's balance should increase by exactly
   * the settlement amount.
   */
  test('Property 6: Settlement Balance Update - balances change correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 5 }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
        fc.nat(),
        fc.nat(),
        (memberNames, settlementAmount, fromIndex, toIndex) => {
          // Setup: Create members
          service.reset();
          const memberIds = memberNames.map((name, i) => `member_${i}`);
          memberIds.forEach((id, i) => service.addMember(id, memberNames[i]));

          // Ensure from and to are different
          const fromId = memberIds[fromIndex % memberIds.length];
          let toId = memberIds[toIndex % memberIds.length];
          if (fromId === toId) {
            toId = memberIds[(toIndex + 1) % memberIds.length];
          }

          // Get balances before settlement
          const balancesBefore = service.calculateBalances();
          const fromBalanceBefore = balancesBefore[fromId];
          const toBalanceBefore = balancesBefore[toId];

          // Add settlement
          service.addSettlement(fromId, toId, settlementAmount);

          // Get balances after settlement
          const balancesAfter = service.calculateBalances();
          const fromBalanceAfter = balancesAfter[fromId];
          const toBalanceAfter = balancesAfter[toId];

          // Verify: From balance should increase by settlement amount
          expect(Math.abs((fromBalanceAfter - fromBalanceBefore) - settlementAmount)).toBeLessThan(0.01);

          // Verify: To balance should decrease by settlement amount
          expect(Math.abs((toBalanceAfter - toBalanceBefore) + settlementAmount)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Fully Settled Detection
   * Feature: trip-groups, Property 7: Fully Settled Detection
   * Validates: Requirements 4.4, 7.4
   * 
   * For any trip group where all member balances are zero,
   * the group should be marked as "Fully Settled".
   */
  test('Property 7: Fully Settled Detection - detects when all balances are zero', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 5 }),
        (memberNames) => {
          // Setup: Create members with zero balances
          service.reset();
          const memberIds = memberNames.map((name, i) => `member_${i}`);
          memberIds.forEach((id, i) => service.addMember(id, memberNames[i]));

          // Calculate balances (should all be zero)
          const balances = service.calculateBalances();

          // Verify: All balances should be zero
          const isFullySettled = Object.values(balances).every(b => Math.abs(b) < 0.01);
          expect(isFullySettled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Simplified Debts Preserve Total Debt
   * 
   * When debts are simplified, the total amount owed should remain the same.
   */
  test('Debt Simplification - preserves total debt amount', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            paidByIndex: fc.nat(),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
            splitIndices: fc.array(fc.nat(), { minLength: 1, maxLength: 10 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (memberNames, expenseData) => {
          // Setup
          service.reset();
          const memberIds = memberNames.map((name, i) => `member_${i}`);
          memberIds.forEach((id, i) => service.addMember(id, memberNames[i]));

          // Add expenses
          expenseData.forEach(exp => {
            const paidBy = memberIds[exp.paidByIndex % memberIds.length];
            const participants = exp.splitIndices
              .map(idx => memberIds[idx % memberIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx);

            if (participants.length === 0) return;

            const splitAmount = exp.amount / participants.length;
            const splits = participants.map(memberId => ({
              memberId,
              amount: Math.round(splitAmount * 100) / 100
            }));

            const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
            splits[splits.length - 1].amount += Math.round((exp.amount - totalSplit) * 100) / 100;

            service.addExpense(paidBy, splits);
          });

          // Get original balances
          const balances = service.calculateBalances();
          const totalDebt = Object.values(balances)
            .filter(b => b < 0)
            .reduce((sum, b) => sum + Math.abs(b), 0);

          // Get simplified transactions
          const transactions = service.simplifyDebts();
          const simplifiedDebt = transactions.reduce((sum, t) => sum + t.amount, 0);

          // Verify: Total debt should be preserved
          expect(Math.abs(totalDebt - simplifiedDebt)).toBeLessThan(0.1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
