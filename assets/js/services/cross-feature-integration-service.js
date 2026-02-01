// Cross-Feature Integration Service
// Handles automatic expense/income creation when actions occur in other modules
// Implements: Vehicle ↔ Expenses, House ↔ Expenses, House Help ↔ Expenses, 
// Loans ↔ Expenses, Investments ↔ Income integrations

import firestoreService from './firestore-service.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class CrossFeatureIntegrationService {
  constructor() {
    // Category mappings for different linked types
    this.expenseCategories = {
      vehicle: {
        fuel: 'Vehicle Fuel',
        maintenance: 'Vehicle Maintenance',
        insurance: 'Insurance',
        tax: 'Taxes',
        other: 'Transportation'
      },
      house: {
        rent: 'Rent',
        mortgage: 'Rent',
        maintenance: 'House Maintenance',
        utilities: 'Bills & Utilities',
        tax: 'Taxes',
        insurance: 'Insurance',
        other: 'House Maintenance'
      },
      houseHelp: {
        salary: 'House Help',
        advance: 'House Help',
        bonus: 'House Help'
      },
      loan: {
        emi: 'EMI Payment',
        prepayment: 'EMI Payment',
        interest: 'EMI Payment'
      }
    };

    this.incomeCategories = {
      vehicle: {
        rental: 'Rental',
        sale: 'Other',
        other: 'Other'
      },
      house: {
        rent: 'Rental',
        sale: 'Other',
        other: 'Rental'
      },
      investment: {
        dividend: 'Dividends',
        interest: 'Interest',
        capitalGains: 'Investments',
        maturity: 'Investments',
        other: 'Investments'
      }
    };
  }

  // ============================================
  // VEHICLE INTEGRATIONS
  // ============================================

  /**
   * Create expense when fuel is logged for a vehicle
   */
  async createFuelExpense(vehicleId, vehicleName, fuelData) {
    const expenseData = {
      amount: fuelData.totalCost || (fuelData.fuelQuantity * fuelData.fuelPrice),
      category: this.expenseCategories.vehicle.fuel,
      description: `Fuel: ${fuelData.fuelQuantity}L @ ₹${fuelData.fuelPrice}/L${fuelData.fuelStation ? ' at ' + fuelData.fuelStation : ''}`,
      date: fuelData.date instanceof Date ? fuelData.date : new Date(fuelData.date),
      paymentMethod: fuelData.paymentMethod || 'Cash',
      specificPaymentMethodId: fuelData.specificPaymentMethod || null,
      linkedType: 'vehicle',
      linkedId: vehicleId,
      linkedName: vehicleName,
      linkedSubType: 'fuel',
      fuelLogId: fuelData.fuelLogId || null
    };

    return await firestoreService.addExpense(expenseData);
  }

  /**
   * Create expense when vehicle maintenance is recorded
   */
  async createVehicleMaintenanceExpense(vehicleId, vehicleName, maintenanceData) {
    const expenseData = {
      amount: maintenanceData.amount,
      category: this.expenseCategories.vehicle.maintenance,
      description: maintenanceData.description || `Vehicle Maintenance: ${vehicleName}`,
      date: maintenanceData.date instanceof Date ? maintenanceData.date : new Date(maintenanceData.date),
      paymentMethod: maintenanceData.paymentMethod || 'Cash',
      specificPaymentMethodId: maintenanceData.specificPaymentMethod || null,
      linkedType: 'vehicle',
      linkedId: vehicleId,
      linkedName: vehicleName,
      linkedSubType: 'maintenance',
      maintenanceType: maintenanceData.maintenanceType || 'general'
    };

    return await firestoreService.addExpense(expenseData);
  }

  /**
   * Create expense when vehicle insurance is paid
   */
  async createVehicleInsuranceExpense(vehicleId, vehicleName, insuranceData) {
    const expenseData = {
      amount: insuranceData.amount,
      category: this.expenseCategories.vehicle.insurance,
      description: `Vehicle Insurance: ${vehicleName}${insuranceData.policyNumber ? ' - Policy: ' + insuranceData.policyNumber : ''}`,
      date: insuranceData.date instanceof Date ? insuranceData.date : new Date(insuranceData.date),
      paymentMethod: insuranceData.paymentMethod || 'Bank Transfer',
      linkedType: 'vehicle',
      linkedId: vehicleId,
      linkedName: vehicleName,
      linkedSubType: 'insurance'
    };

    return await firestoreService.addExpense(expenseData);
  }

  /**
   * Create income when vehicle generates revenue (rental, sale, etc.)
   */
  async createVehicleIncome(vehicleId, vehicleName, incomeData) {
    const incomeEntry = {
      amount: incomeData.amount,
      source: this.incomeCategories.vehicle[incomeData.type] || 'Other',
      description: incomeData.description || `Vehicle Income: ${vehicleName}`,
      date: incomeData.date instanceof Date ? incomeData.date : new Date(incomeData.date),
      paymentMethod: incomeData.paymentMethod || 'Bank Transfer',
      linkedType: 'vehicle',
      linkedId: vehicleId,
      linkedName: vehicleName,
      linkedSubType: incomeData.type || 'other'
    };

    return await firestoreService.addIncome(incomeEntry);
  }

  // ============================================
  // HOUSE INTEGRATIONS
  // ============================================

  /**
   * Create expense for house-related payments
   */
  async createHouseExpense(houseId, houseName, expenseData) {
    const category = this.expenseCategories.house[expenseData.type] || this.expenseCategories.house.other;
    
    const expense = {
      amount: expenseData.amount,
      category: category,
      description: expenseData.description || `${expenseData.type}: ${houseName}`,
      date: expenseData.date instanceof Date ? expenseData.date : new Date(expenseData.date),
      paymentMethod: expenseData.paymentMethod || 'Bank Transfer',
      linkedType: 'house',
      linkedId: houseId,
      linkedName: houseName,
      linkedSubType: expenseData.type || 'other'
    };

    return await firestoreService.addExpense(expense);
  }

  /**
   * Create income for house-related earnings (rent, sale, etc.)
   */
  async createHouseIncome(houseId, houseName, incomeData) {
    const source = this.incomeCategories.house[incomeData.type] || 'Rental';
    
    const income = {
      amount: incomeData.amount,
      source: source,
      description: incomeData.description || `${incomeData.type}: ${houseName}`,
      date: incomeData.date instanceof Date ? incomeData.date : new Date(incomeData.date),
      paymentMethod: incomeData.paymentMethod || 'Bank Transfer',
      linkedType: 'house',
      linkedId: houseId,
      linkedName: houseName,
      linkedSubType: incomeData.type || 'rent'
    };

    return await firestoreService.addIncome(income);
  }

  // ============================================
  // HOUSE HELP INTEGRATIONS
  // ============================================

  /**
   * Create expense when house help salary is paid
   */
  async createHouseHelpSalaryExpense(staffId, staffName, staffRole, paymentData) {
    const expenseData = {
      amount: paymentData.amount,
      category: this.expenseCategories.houseHelp.salary,
      description: `Payment to ${staffName} (${staffRole})${paymentData.note ? ' - ' + paymentData.note : ''}`,
      date: paymentData.date instanceof Date ? paymentData.date : new Date(paymentData.date),
      paymentMethod: paymentData.paymentMethod || 'Cash',
      specificPaymentMethodId: paymentData.specificPaymentMethod || null,
      linkedType: 'houseHelp',
      linkedId: staffId,
      linkedName: staffName,
      linkedSubType: 'salary',
      isHouseHelpPayment: true,
      houseHelpPaymentId: paymentData.paymentId || null,
      staffId: staffId
    };

    return await firestoreService.addExpense(expenseData);
  }

  /**
   * Create expense when advance is given to house help
   */
  async createHouseHelpAdvanceExpense(staffId, staffName, staffRole, advanceData) {
    const expenseData = {
      amount: advanceData.amount,
      category: this.expenseCategories.houseHelp.advance,
      description: `Advance to ${staffName} (${staffRole})${advanceData.note ? ' - ' + advanceData.note : ''}`,
      date: advanceData.date instanceof Date ? advanceData.date : new Date(advanceData.date),
      paymentMethod: advanceData.paymentMethod || 'Cash',
      linkedType: 'houseHelp',
      linkedId: staffId,
      linkedName: staffName,
      linkedSubType: 'advance',
      isHouseHelpPayment: true,
      staffId: staffId
    };

    return await firestoreService.addExpense(expenseData);
  }

  // ============================================
  // LOAN INTEGRATIONS
  // ============================================

  /**
   * Create expense when EMI is paid
   */
  async createLoanEMIExpense(loanId, loanName, lender, paymentData) {
    const expenseData = {
      amount: paymentData.amount,
      category: this.expenseCategories.loan.emi,
      description: `${loanName} - ${paymentData.type === 'emi' ? 'EMI Payment' : 'Prepayment'}${lender ? ' (' + lender + ')' : ''}`,
      date: paymentData.date instanceof Date ? paymentData.date : new Date(paymentData.date),
      paymentMethod: paymentData.paymentMethod || 'Bank Transfer',
      linkedType: 'loan',
      linkedId: loanId,
      linkedName: loanName,
      linkedSubType: paymentData.type || 'emi',
      loanPaymentType: paymentData.type,
      principalPaid: paymentData.principalPaid || 0,
      interestPaid: paymentData.interestPaid || 0
    };

    return await firestoreService.addExpense(expenseData);
  }

  /**
   * Get EMI breakdown (principal vs interest) for a payment
   */
  calculateEMIBreakdown(outstandingAmount, interestRate, emiAmount) {
    const monthlyRate = interestRate / 12 / 100;
    const interestPaid = outstandingAmount * monthlyRate;
    const principalPaid = emiAmount - interestPaid;

    return {
      interestPaid: Math.round(interestPaid * 100) / 100,
      principalPaid: Math.round(principalPaid * 100) / 100
    };
  }

  // ============================================
  // INVESTMENT INTEGRATIONS
  // ============================================

  /**
   * Create income when dividend is received
   */
  async createDividendIncome(investmentId, investmentName, dividendData) {
    const incomeEntry = {
      amount: dividendData.amount,
      source: this.incomeCategories.investment.dividend,
      description: `Dividend: ${investmentName}${dividendData.note ? ' - ' + dividendData.note : ''}`,
      date: dividendData.date instanceof Date ? dividendData.date : new Date(dividendData.date),
      paymentMethod: dividendData.paymentMethod || 'Bank Transfer',
      linkedType: 'investment',
      linkedId: investmentId,
      linkedName: investmentName,
      linkedSubType: 'dividend',
      dividendPerShare: dividendData.dividendPerShare || null,
      quantity: dividendData.quantity || null
    };

    return await firestoreService.addIncome(incomeEntry);
  }

  /**
   * Create income when interest is received (FD, bonds, etc.)
   */
  async createInterestIncome(investmentId, investmentName, interestData) {
    const incomeEntry = {
      amount: interestData.amount,
      source: this.incomeCategories.investment.interest,
      description: `Interest: ${investmentName}${interestData.note ? ' - ' + interestData.note : ''}`,
      date: interestData.date instanceof Date ? interestData.date : new Date(interestData.date),
      paymentMethod: interestData.paymentMethod || 'Bank Transfer',
      linkedType: 'investment',
      linkedId: investmentId,
      linkedName: investmentName,
      linkedSubType: 'interest'
    };

    return await firestoreService.addIncome(incomeEntry);
  }

  /**
   * Create income when capital gains are realized (sale of investment)
   */
  async createCapitalGainsIncome(investmentId, investmentName, saleData) {
    const capitalGains = saleData.saleAmount - saleData.purchaseAmount;
    
    if (capitalGains <= 0) {
      // No income to record for loss
      return { success: true, message: 'No capital gains to record (loss or break-even)' };
    }

    const incomeEntry = {
      amount: capitalGains,
      source: this.incomeCategories.investment.capitalGains,
      description: `Capital Gains: ${investmentName} (Sold ${saleData.quantity} units)`,
      date: saleData.date instanceof Date ? saleData.date : new Date(saleData.date),
      paymentMethod: saleData.paymentMethod || 'Bank Transfer',
      linkedType: 'investment',
      linkedId: investmentId,
      linkedName: investmentName,
      linkedSubType: 'capitalGains',
      saleAmount: saleData.saleAmount,
      purchaseAmount: saleData.purchaseAmount,
      quantity: saleData.quantity,
      holdingPeriod: saleData.holdingPeriod || null
    };

    return await firestoreService.addIncome(incomeEntry);
  }

  // ============================================
  // REPORTING & ANALYTICS
  // ============================================

  /**
   * Get all expenses linked to a specific entity
   */
  async getLinkedExpenses(linkedType, linkedId) {
    return await firestoreService.getExpensesByLinked(linkedType, linkedId);
  }

  /**
   * Get all income linked to a specific entity
   */
  async getLinkedIncome(linkedType, linkedId) {
    return await firestoreService.getIncomeByLinked(linkedType, linkedId);
  }

  /**
   * Get total expenses for a linked type (e.g., all vehicle expenses)
   */
  async getTotalExpensesByType(linkedType) {
    return await firestoreService.getTotalExpensesByLinkedType(linkedType);
  }

  /**
   * Get total income for a linked type (e.g., all house rental income)
   */
  async getTotalIncomeByType(linkedType) {
    return await firestoreService.getTotalIncomeByLinkedType(linkedType);
  }

  /**
   * Get expense breakdown by sub-type for a linked entity
   */
  async getExpenseBreakdown(linkedType, linkedId = null) {
    let expenses;
    if (linkedId) {
      expenses = await this.getLinkedExpenses(linkedType, linkedId);
    } else {
      // Use optimized query instead of loading all expenses
      expenses = await firestoreService.getExpensesByLinkedType(linkedType);
    }

    const breakdown = {};
    expenses.forEach(expense => {
      const subType = expense.linkedSubType || 'other';
      if (!breakdown[subType]) {
        breakdown[subType] = { count: 0, total: 0 };
      }
      breakdown[subType].count++;
      breakdown[subType].total += expense.amount || 0;
    });

    return breakdown;
  }

  /**
   * Get income breakdown by sub-type for a linked entity
   */
  async getIncomeBreakdown(linkedType, linkedId = null) {
    let income;
    if (linkedId) {
      income = await this.getLinkedIncome(linkedType, linkedId);
    } else {
      // Use optimized query instead of loading all income
      income = await firestoreService.getIncomeByLinkedType(linkedType);
    }

    const breakdown = {};
    income.forEach(inc => {
      const subType = inc.linkedSubType || 'other';
      if (!breakdown[subType]) {
        breakdown[subType] = { count: 0, total: 0 };
      }
      breakdown[subType].count++;
      breakdown[subType].total += inc.amount || 0;
    });

    return breakdown;
  }

  /**
   * Delete linked expense when source record is deleted
   */
  async deleteLinkedExpense(linkedType, linkedId, linkedSubType = null) {
    const expenses = await this.getLinkedExpenses(linkedType, linkedId);
    const toDelete = linkedSubType 
      ? expenses.filter(e => e.linkedSubType === linkedSubType)
      : expenses;

    for (const expense of toDelete) {
      await firestoreService.deleteExpense(expense.id);
    }

    return { success: true, deletedCount: toDelete.length };
  }

  /**
   * Delete linked income when source record is deleted
   */
  async deleteLinkedIncome(linkedType, linkedId, linkedSubType = null) {
    const income = await this.getLinkedIncome(linkedType, linkedId);
    const toDelete = linkedSubType 
      ? income.filter(i => i.linkedSubType === linkedSubType)
      : income;

    for (const inc of toDelete) {
      await firestoreService.deleteIncome(inc.id);
    }

    return { success: true, deletedCount: toDelete.length };
  }
}

const crossFeatureIntegrationService = new CrossFeatureIntegrationService();
export default crossFeatureIntegrationService;
