// Investment Analytics Service
// Provides portfolio analysis, allocation charts, risk metrics, and performance calculations
// Implements: Portfolio allocation, sector distribution, XIRR/CAGR, risk analysis

import firestoreService from './firestore-service.js';

class InvestmentAnalyticsService {
  constructor() {
    // Investment type to sector mapping
    this.typeToSector = {
      'Stocks': 'Equity',
      'Mutual Funds': 'Equity/Debt',
      'Cryptocurrency': 'Crypto',
      'Real Estate': 'Real Estate',
      'Gold': 'Commodities',
      'Fixed Deposit': 'Fixed Income',
      'Bonds': 'Fixed Income',
      'PPF': 'Fixed Income',
      'NPS': 'Pension',
      'Other': 'Other'
    };

    // Risk levels by investment type
    this.riskLevels = {
      'Stocks': { level: 'High', score: 8 },
      'Cryptocurrency': { level: 'Very High', score: 10 },
      'Mutual Funds': { level: 'Medium-High', score: 6 },
      'Real Estate': { level: 'Medium', score: 5 },
      'Gold': { level: 'Medium-Low', score: 4 },
      'Fixed Deposit': { level: 'Low', score: 2 },
      'Bonds': { level: 'Low', score: 2 },
      'PPF': { level: 'Very Low', score: 1 },
      'NPS': { level: 'Medium', score: 5 },
      'Other': { level: 'Medium', score: 5 }
    };

    // Benchmark returns (annual %)
    this.benchmarks = {
      'Nifty 50': 12,
      'Sensex': 12,
      'FD Rate': 7,
      'Gold': 8,
      'Inflation': 6
    };
  }

  /**
   * Get complete portfolio analytics
   */
  async getPortfolioAnalytics() {
    try {
      const investments = await firestoreService.getInvestments();
      
      if (!investments || investments.length === 0) {
        return this.getEmptyAnalytics();
      }

      const analytics = {
        summary: this.calculateSummary(investments),
        allocation: this.calculateAllocation(investments),
        sectorDistribution: this.calculateSectorDistribution(investments),
        riskAnalysis: this.calculateRiskAnalysis(investments),
        performance: await this.calculatePerformance(investments),
        topPerformers: this.getTopPerformers(investments),
        bottomPerformers: this.getBottomPerformers(investments),
        diversificationScore: this.calculateDiversificationScore(investments),
        recommendations: this.generateRecommendations(investments)
      };

      return analytics;
    } catch (error) {
      console.error('Error calculating portfolio analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Calculate portfolio summary
   */
  calculateSummary(investments) {
    let totalInvested = 0;
    let currentValue = 0;
    let totalDividends = 0;

    investments.forEach(inv => {
      const invested = inv.quantity * inv.purchasePrice;
      const current = inv.quantity * (inv.livePrice || inv.currentPrice);
      
      totalInvested += invested;
      currentValue += current;
      totalDividends += inv.totalDividends || 0;
    });

    const totalReturns = currentValue - totalInvested;
    const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
    const totalReturnWithDividends = totalReturns + totalDividends;

    return {
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      returnsPercentage: Math.round(returnsPercentage * 100) / 100,
      totalDividends: Math.round(totalDividends * 100) / 100,
      totalReturnWithDividends: Math.round(totalReturnWithDividends * 100) / 100,
      investmentCount: investments.length
    };
  }

  /**
   * Calculate allocation by investment type
   */
  calculateAllocation(investments) {
    const allocation = {};
    let totalValue = 0;

    investments.forEach(inv => {
      const value = inv.quantity * (inv.livePrice || inv.currentPrice);
      totalValue += value;

      const type = inv.type || 'Other';
      if (!allocation[type]) {
        allocation[type] = { value: 0, count: 0, invested: 0 };
      }
      allocation[type].value += value;
      allocation[type].count++;
      allocation[type].invested += inv.quantity * inv.purchasePrice;
    });

    // Calculate percentages
    const result = [];
    for (const [type, data] of Object.entries(allocation)) {
      const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
      const returns = data.value - data.invested;
      const returnsPercentage = data.invested > 0 ? (returns / data.invested) * 100 : 0;

      result.push({
        type,
        value: Math.round(data.value * 100) / 100,
        invested: Math.round(data.invested * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        count: data.count,
        returns: Math.round(returns * 100) / 100,
        returnsPercentage: Math.round(returnsPercentage * 100) / 100
      });
    }

    // Sort by value descending
    result.sort((a, b) => b.value - a.value);

    return {
      data: result,
      totalValue: Math.round(totalValue * 100) / 100
    };
  }

  /**
   * Calculate sector-wise distribution
   */
  calculateSectorDistribution(investments) {
    const sectors = {};
    let totalValue = 0;

    investments.forEach(inv => {
      const value = inv.quantity * (inv.livePrice || inv.currentPrice);
      totalValue += value;

      const sector = this.typeToSector[inv.type] || 'Other';
      if (!sectors[sector]) {
        sectors[sector] = { value: 0, count: 0 };
      }
      sectors[sector].value += value;
      sectors[sector].count++;
    });

    const result = [];
    for (const [sector, data] of Object.entries(sectors)) {
      const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
      result.push({
        sector,
        value: Math.round(data.value * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        count: data.count
      });
    }

    result.sort((a, b) => b.value - a.value);

    return {
      data: result,
      totalValue: Math.round(totalValue * 100) / 100
    };
  }

  /**
   * Calculate risk analysis
   */
  calculateRiskAnalysis(investments) {
    let totalValue = 0;
    let weightedRiskScore = 0;
    const riskBreakdown = {
      'Very Low': { value: 0, percentage: 0 },
      'Low': { value: 0, percentage: 0 },
      'Medium-Low': { value: 0, percentage: 0 },
      'Medium': { value: 0, percentage: 0 },
      'Medium-High': { value: 0, percentage: 0 },
      'High': { value: 0, percentage: 0 },
      'Very High': { value: 0, percentage: 0 }
    };

    investments.forEach(inv => {
      const value = inv.quantity * (inv.livePrice || inv.currentPrice);
      totalValue += value;

      const risk = this.riskLevels[inv.type] || this.riskLevels['Other'];
      weightedRiskScore += risk.score * value;
      riskBreakdown[risk.level].value += value;
    });

    // Calculate percentages
    for (const level of Object.keys(riskBreakdown)) {
      riskBreakdown[level].percentage = totalValue > 0 
        ? Math.round((riskBreakdown[level].value / totalValue) * 100 * 100) / 100 
        : 0;
      riskBreakdown[level].value = Math.round(riskBreakdown[level].value * 100) / 100;
    }

    const averageRiskScore = totalValue > 0 ? weightedRiskScore / totalValue : 0;
    
    let overallRiskLevel;
    if (averageRiskScore <= 2) overallRiskLevel = 'Very Low';
    else if (averageRiskScore <= 4) overallRiskLevel = 'Low';
    else if (averageRiskScore <= 5) overallRiskLevel = 'Medium';
    else if (averageRiskScore <= 7) overallRiskLevel = 'High';
    else overallRiskLevel = 'Very High';

    return {
      overallRiskScore: Math.round(averageRiskScore * 10) / 10,
      overallRiskLevel,
      breakdown: riskBreakdown,
      maxRiskScore: 10
    };
  }

  /**
   * Calculate performance metrics (CAGR, returns by period)
   */
  async calculatePerformance(investments) {
    const now = new Date();
    let totalInvested = 0;
    let currentValue = 0;
    let weightedCAGR = 0;
    let oldestDate = now;

    const periodReturns = {
      '1M': { invested: 0, current: 0 },
      '3M': { invested: 0, current: 0 },
      '6M': { invested: 0, current: 0 },
      '1Y': { invested: 0, current: 0 },
      'All': { invested: 0, current: 0 }
    };

    investments.forEach(inv => {
      const invested = inv.quantity * inv.purchasePrice;
      const current = inv.quantity * (inv.livePrice || inv.currentPrice);
      
      totalInvested += invested;
      currentValue += current;

      // Get purchase date
      const purchaseDate = inv.purchaseDate?.toDate 
        ? inv.purchaseDate.toDate() 
        : new Date(inv.purchaseDate);

      if (purchaseDate < oldestDate) {
        oldestDate = purchaseDate;
      }

      // Calculate CAGR for this investment
      const years = (now - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);
      if (years > 0 && invested > 0) {
        const cagr = (Math.pow(current / invested, 1 / years) - 1) * 100;
        weightedCAGR += cagr * invested;
      }

      // Period returns
      const daysSincePurchase = (now - purchaseDate) / (24 * 60 * 60 * 1000);
      
      periodReturns['All'].invested += invested;
      periodReturns['All'].current += current;

      if (daysSincePurchase <= 30) {
        periodReturns['1M'].invested += invested;
        periodReturns['1M'].current += current;
      }
      if (daysSincePurchase <= 90) {
        periodReturns['3M'].invested += invested;
        periodReturns['3M'].current += current;
      }
      if (daysSincePurchase <= 180) {
        periodReturns['6M'].invested += invested;
        periodReturns['6M'].current += current;
      }
      if (daysSincePurchase <= 365) {
        periodReturns['1Y'].invested += invested;
        periodReturns['1Y'].current += current;
      }
    });

    // Calculate period return percentages
    const periodReturnPercentages = {};
    for (const [period, data] of Object.entries(periodReturns)) {
      if (data.invested > 0) {
        periodReturnPercentages[period] = {
          invested: Math.round(data.invested * 100) / 100,
          current: Math.round(data.current * 100) / 100,
          returns: Math.round((data.current - data.invested) * 100) / 100,
          percentage: Math.round(((data.current - data.invested) / data.invested) * 100 * 100) / 100
        };
      } else {
        periodReturnPercentages[period] = null;
      }
    }

    // Overall CAGR
    const overallCAGR = totalInvested > 0 ? weightedCAGR / totalInvested : 0;

    // Calculate XIRR (simplified - using CAGR as approximation)
    const totalYears = (now - oldestDate) / (365.25 * 24 * 60 * 60 * 1000);
    const xirr = totalYears > 0 && totalInvested > 0
      ? (Math.pow(currentValue / totalInvested, 1 / totalYears) - 1) * 100
      : 0;

    // Benchmark comparison
    const benchmarkComparison = {};
    for (const [benchmark, annualReturn] of Object.entries(this.benchmarks)) {
      const benchmarkValue = totalInvested * Math.pow(1 + annualReturn / 100, totalYears);
      benchmarkComparison[benchmark] = {
        expectedValue: Math.round(benchmarkValue * 100) / 100,
        actualValue: Math.round(currentValue * 100) / 100,
        outperformance: Math.round((currentValue - benchmarkValue) * 100) / 100,
        outperformancePercentage: Math.round(((currentValue - benchmarkValue) / benchmarkValue) * 100 * 100) / 100
      };
    }

    return {
      cagr: Math.round(overallCAGR * 100) / 100,
      xirr: Math.round(xirr * 100) / 100,
      absoluteReturns: Math.round((currentValue - totalInvested) * 100) / 100,
      absoluteReturnsPercentage: totalInvested > 0 
        ? Math.round(((currentValue - totalInvested) / totalInvested) * 100 * 100) / 100 
        : 0,
      periodReturns: periodReturnPercentages,
      benchmarkComparison,
      investmentPeriodYears: Math.round(totalYears * 10) / 10
    };
  }

  /**
   * Get top performing investments
   */
  getTopPerformers(investments, limit = 5) {
    const withReturns = investments.map(inv => {
      const invested = inv.quantity * inv.purchasePrice;
      const current = inv.quantity * (inv.livePrice || inv.currentPrice);
      const returns = current - invested;
      const returnsPercentage = invested > 0 ? (returns / invested) * 100 : 0;

      return {
        id: inv.id,
        name: inv.name,
        symbol: inv.symbol,
        type: inv.type,
        invested: Math.round(invested * 100) / 100,
        currentValue: Math.round(current * 100) / 100,
        returns: Math.round(returns * 100) / 100,
        returnsPercentage: Math.round(returnsPercentage * 100) / 100
      };
    });

    return withReturns
      .sort((a, b) => b.returnsPercentage - a.returnsPercentage)
      .slice(0, limit);
  }

  /**
   * Get bottom performing investments
   */
  getBottomPerformers(investments, limit = 5) {
    const withReturns = investments.map(inv => {
      const invested = inv.quantity * inv.purchasePrice;
      const current = inv.quantity * (inv.livePrice || inv.currentPrice);
      const returns = current - invested;
      const returnsPercentage = invested > 0 ? (returns / invested) * 100 : 0;

      return {
        id: inv.id,
        name: inv.name,
        symbol: inv.symbol,
        type: inv.type,
        invested: Math.round(invested * 100) / 100,
        currentValue: Math.round(current * 100) / 100,
        returns: Math.round(returns * 100) / 100,
        returnsPercentage: Math.round(returnsPercentage * 100) / 100
      };
    });

    return withReturns
      .sort((a, b) => a.returnsPercentage - b.returnsPercentage)
      .slice(0, limit);
  }

  /**
   * Calculate diversification score (0-100)
   */
  calculateDiversificationScore(investments) {
    if (investments.length === 0) return 0;
    if (investments.length === 1) return 20;

    // Factors for diversification score:
    // 1. Number of investments (max 30 points)
    // 2. Type diversity (max 30 points)
    // 3. Sector diversity (max 20 points)
    // 4. Concentration (max 20 points)

    let score = 0;

    // 1. Number of investments
    const countScore = Math.min(30, investments.length * 3);
    score += countScore;

    // 2. Type diversity
    const types = new Set(investments.map(inv => inv.type));
    const typeScore = Math.min(30, types.size * 6);
    score += typeScore;

    // 3. Sector diversity
    const sectors = new Set(investments.map(inv => this.typeToSector[inv.type] || 'Other'));
    const sectorScore = Math.min(20, sectors.size * 4);
    score += sectorScore;

    // 4. Concentration (lower is better)
    const totalValue = investments.reduce((sum, inv) => 
      sum + inv.quantity * (inv.livePrice || inv.currentPrice), 0);
    
    if (totalValue > 0) {
      const maxConcentration = Math.max(...investments.map(inv => 
        (inv.quantity * (inv.livePrice || inv.currentPrice)) / totalValue));
      
      // If max concentration is 100%, score is 0. If 10%, score is 18
      const concentrationScore = Math.max(0, 20 - (maxConcentration * 100 - 10) * 0.2);
      score += concentrationScore;
    }

    return Math.round(Math.min(100, score));
  }

  /**
   * Generate investment recommendations
   */
  generateRecommendations(investments) {
    const recommendations = [];
    const allocation = this.calculateAllocation(investments);
    const riskAnalysis = this.calculateRiskAnalysis(investments);
    const diversificationScore = this.calculateDiversificationScore(investments);

    // Check diversification
    if (diversificationScore < 40) {
      recommendations.push({
        type: 'warning',
        title: 'Low Diversification',
        message: 'Your portfolio is not well diversified. Consider adding investments in different asset classes.',
        priority: 'high'
      });
    }

    // Check concentration
    const maxAllocation = allocation.data[0];
    if (maxAllocation && maxAllocation.percentage > 50) {
      recommendations.push({
        type: 'warning',
        title: 'High Concentration',
        message: `${maxAllocation.type} makes up ${maxAllocation.percentage}% of your portfolio. Consider rebalancing.`,
        priority: 'high'
      });
    }

    // Check risk level
    if (riskAnalysis.overallRiskScore > 7) {
      recommendations.push({
        type: 'info',
        title: 'High Risk Portfolio',
        message: 'Your portfolio has high risk exposure. Consider adding some fixed income investments for stability.',
        priority: 'medium'
      });
    }

    // Check for missing asset classes
    const hasEquity = allocation.data.some(a => a.type === 'Stocks' || a.type === 'Mutual Funds');
    const hasFixedIncome = allocation.data.some(a => a.type === 'Fixed Deposit' || a.type === 'Bonds');
    const hasGold = allocation.data.some(a => a.type === 'Gold');

    if (!hasEquity && investments.length > 0) {
      recommendations.push({
        type: 'suggestion',
        title: 'Consider Equity',
        message: 'Adding stocks or mutual funds can help grow your wealth over the long term.',
        priority: 'low'
      });
    }

    if (!hasFixedIncome && investments.length > 2) {
      recommendations.push({
        type: 'suggestion',
        title: 'Add Fixed Income',
        message: 'Fixed deposits or bonds can provide stability and regular income.',
        priority: 'low'
      });
    }

    if (!hasGold && investments.length > 3) {
      recommendations.push({
        type: 'suggestion',
        title: 'Consider Gold',
        message: 'Gold can act as a hedge against inflation and market volatility.',
        priority: 'low'
      });
    }

    // Check for underperformers
    const bottomPerformers = this.getBottomPerformers(investments, 3);
    const significantLosers = bottomPerformers.filter(p => p.returnsPercentage < -20);
    
    if (significantLosers.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Review Underperformers',
        message: `${significantLosers.length} investment(s) have lost more than 20%. Review if they still align with your goals.`,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Get empty analytics structure
   */
  getEmptyAnalytics() {
    return {
      summary: {
        totalInvested: 0,
        currentValue: 0,
        totalReturns: 0,
        returnsPercentage: 0,
        totalDividends: 0,
        totalReturnWithDividends: 0,
        investmentCount: 0
      },
      allocation: { data: [], totalValue: 0 },
      sectorDistribution: { data: [], totalValue: 0 },
      riskAnalysis: {
        overallRiskScore: 0,
        overallRiskLevel: 'N/A',
        breakdown: {},
        maxRiskScore: 10
      },
      performance: {
        cagr: 0,
        xirr: 0,
        absoluteReturns: 0,
        absoluteReturnsPercentage: 0,
        periodReturns: {},
        benchmarkComparison: {},
        investmentPeriodYears: 0
      },
      topPerformers: [],
      bottomPerformers: [],
      diversificationScore: 0,
      recommendations: [{
        type: 'info',
        title: 'Get Started',
        message: 'Add your first investment to see portfolio analytics.',
        priority: 'high'
      }]
    };
  }

  /**
   * Get chart data for allocation pie chart
   */
  getChartData(analytics, chartType = 'allocation') {
    if (chartType === 'allocation') {
      return {
        labels: analytics.allocation.data.map(a => a.type),
        values: analytics.allocation.data.map(a => a.value),
        percentages: analytics.allocation.data.map(a => a.percentage),
        colors: this.getChartColors(analytics.allocation.data.length)
      };
    } else if (chartType === 'sector') {
      return {
        labels: analytics.sectorDistribution.data.map(s => s.sector),
        values: analytics.sectorDistribution.data.map(s => s.value),
        percentages: analytics.sectorDistribution.data.map(s => s.percentage),
        colors: this.getChartColors(analytics.sectorDistribution.data.length)
      };
    } else if (chartType === 'risk') {
      const riskLevels = ['Very Low', 'Low', 'Medium-Low', 'Medium', 'Medium-High', 'High', 'Very High'];
      return {
        labels: riskLevels,
        values: riskLevels.map(l => analytics.riskAnalysis.breakdown[l]?.value || 0),
        percentages: riskLevels.map(l => analytics.riskAnalysis.breakdown[l]?.percentage || 0),
        colors: ['#10B981', '#34D399', '#6EE7B7', '#FCD34D', '#FBBF24', '#F59E0B', '#EF4444']
      };
    }

    return { labels: [], values: [], percentages: [], colors: [] };
  }

  /**
   * Get chart colors
   */
  getChartColors(count) {
    const colors = [
      '#4A90E2', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6',
      '#1ABC9C', '#E67E22', '#3498DB', '#2ECC71', '#E91E63',
      '#00BCD4', '#FF5722', '#607D8B', '#795548', '#9C27B0'
    ];
    return colors.slice(0, count);
  }
}

const investmentAnalyticsService = new InvestmentAnalyticsService();
export default investmentAnalyticsService;
