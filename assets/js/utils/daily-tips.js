// Daily Financial Tips
const DAILY_TIPS = [
  {
    tip: "Track every expense, no matter how small. Those ₹50 chai breaks add up to ₹1,500/month!",
    action: "Add an expense",
    link: "expenses.html"
  },
  {
    tip: "The 50/30/20 rule: 50% needs, 30% wants, 20% savings. Try it this month!",
    action: "Set a budget",
    link: "budgets.html"
  },
  {
    tip: "Emergency fund tip: Aim for 3-6 months of expenses saved. Start with ₹1,000 today.",
    action: "Create a goal",
    link: "goals.html"
  },
  {
    tip: "Review your subscriptions monthly. Cancel what you don't use - save ₹500-2000/month!",
    action: "Check recurring",
    link: "recurring.html"
  },
  {
    tip: "Pay yourself first! Set up automatic transfers to savings on payday.",
    action: "Add income",
    link: "income.html"
  },
  {
    tip: "Use the 24-hour rule: Wait a day before making non-essential purchases over ₹1,000.",
    action: null,
    link: null
  },
  {
    tip: "Track your net worth monthly. It's the best measure of financial progress!",
    action: "View analytics",
    link: "analytics.html"
  },
  {
    tip: "Meal planning can save ₹3,000-5,000/month. Try planning your week's meals!",
    action: null,
    link: null
  },
  {
    tip: "Review your spending weekly. Small adjustments lead to big savings!",
    action: "View expenses",
    link: "expenses.html"
  },
  {
    tip: "Set specific financial goals with deadlines. 'Save ₹50,000 by December' beats 'save more'.",
    action: "Set a goal",
    link: "goals.html"
  },
  {
    tip: "Compare prices before big purchases. A 10-minute search can save thousands!",
    action: null,
    link: null
  },
  {
    tip: "Automate your bills to avoid late fees. Set up reminders for manual payments.",
    action: "Add recurring",
    link: "recurring.html"
  },
  {
    tip: "Review your insurance policies annually. You might be overpaying or underinsured.",
    action: null,
    link: null
  },
  {
    tip: "Start investing early! Even ₹500/month in SIP can grow to lakhs over time.",
    action: "Track investments",
    link: "investments.html"
  },
  {
    tip: "Use cash for discretionary spending. Physical money makes you more mindful.",
    action: null,
    link: null
  },
  {
    tip: "Negotiate your bills! Call your service providers - many offer retention discounts.",
    action: null,
    link: null
  },
  {
    tip: "Track your fuel expenses. Carpooling or public transport can save ₹2,000-5,000/month.",
    action: "Track vehicles",
    link: "vehicles.html"
  },
  {
    tip: "Review your credit card statements. Dispute any unauthorized charges immediately.",
    action: null,
    link: null
  },
  {
    tip: "Set up a 'fun money' budget. Guilt-free spending within limits keeps you motivated!",
    action: "Set budget",
    link: "budgets.html"
  },
  {
    tip: "Set financial goals and track your progress towards wealth building!",
    action: "Set goals",
    link: "goals.html"
  }
];

// Get today's tip based on date
export function getDailyTip() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const tipIndex = dayOfYear % DAILY_TIPS.length;
  return DAILY_TIPS[tipIndex];
}

// Create daily tip card HTML
export function createDailyTipCard() {
  const tip = getDailyTip();
  
  const card = document.createElement('div');
  card.className = 'daily-tip-card';
  card.innerHTML = `
    <div class="daily-tip-header">
      <span>💡</span>
      <span>Daily Tip</span>
    </div>
    <div class="daily-tip-content">${tip.tip}</div>
    ${tip.action ? `
      <div class="daily-tip-action">
        <a href="${tip.link}">${tip.action} →</a>
      </div>
    ` : ''}
  `;
  
  return card;
}

export default { getDailyTip, createDailyTipCard };
