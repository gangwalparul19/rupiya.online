import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting weekly report cron job...');
    
    // Get all users who have opted in for weekly reports
    const prefsSnapshot = await db.collection('userPreferences')
      .where('weeklyReportEnabled', '==', true)
      .get();

    if (prefsSnapshot.empty) {
      console.log('No users opted in for weekly reports');
      return res.status(200).json({ message: 'No users to process', count: 0 });
    }

    const results = { success: 0, failed: 0, errors: [] };
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    for (const prefDoc of prefsSnapshot.docs) {
      const prefs = prefDoc.data();
      const userId = prefDoc.id;

      try {
        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const userEmail = userData.email || prefs.email;
        
        if (!userEmail) {
          console.log(`No email for user ${userId}, skipping`);
          continue;
        }

        // Get expenses for this user
        const expensesSnapshot = await db.collection('expenses')
          .where('userId', '==', userId)
          .get();
        
        const expenses = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get income for this user
        const incomeSnapshot = await db.collection('income')
          .where('userId', '==', userId)
          .get();
        
        const income = incomeSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate weekly and total amounts
        const weeklyExpenses = calculateWeeklyTotal(expenses, weekAgo);
        const weeklyIncome = calculateWeeklyTotal(income, weekAgo);
        const totalExpenses = calculateTotal(expenses);
        const totalIncome = calculateTotal(income);

        // Get category breakdowns for the week
        const expensesByCategory = getCategoryBreakdown(expenses, weekAgo);
        const incomeByCategory = getCategoryBreakdown(income, weekAgo);

        // Get weekly transactions for CSV
        const transactions = getWeeklyTransactions(expenses, income, weekAgo);

        // Send the report
        const baseUrl = process.env.APP_URL || 'https://www.rupiya.online';
        const response = await fetch(`${baseUrl}/api/send-weekly-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail,
            userName: userData.displayName || userData.name || 'User',
            currency: prefs.currency || 'INR',
            weeklyExpenses,
            weeklyIncome,
            totalExpenses,
            totalIncome,
            expensesByCategory,
            incomeByCategory,
            transactions
          })
        });

        if (response.ok) {
          results.success++;
          console.log(`Report sent to ${userEmail}`);
        } else {
          results.failed++;
          results.errors.push({ userId, error: await response.text() });
        }
      } catch (userError) {
        results.failed++;
        results.errors.push({ userId, error: userError.message });
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    console.log(`Weekly reports completed: ${results.success} sent, ${results.failed} failed`);
    return res.status(200).json({
      message: 'Weekly reports processed',
      ...results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: 'Cron job failed', details: error.message });
  }
}

function calculateWeeklyTotal(items, weekAgo) {
  return items
    .filter(item => {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      return itemDate >= weekAgo;
    })
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function getCategoryBreakdown(items, weekAgo) {
  const breakdown = {};
  items
    .filter(item => {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      return itemDate >= weekAgo;
    })
    .forEach(item => {
      const category = item.category || 'Other';
      breakdown[category] = (breakdown[category] || 0) + (Number(item.amount) || 0);
    });
  return breakdown;
}

function getWeeklyTransactions(expenses, income, weekAgo) {
  const transactions = [];
  
  expenses
    .filter(item => {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      return itemDate >= weekAgo;
    })
    .forEach(item => {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      transactions.push({
        date: itemDate.toISOString().split('T')[0],
        type: 'Expense',
        category: item.category || 'Other',
        amount: item.amount || 0,
        description: item.description || ''
      });
    });

  income
    .filter(item => {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      return itemDate >= weekAgo;
    })
    .forEach(item => {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      transactions.push({
        date: itemDate.toISOString().split('T')[0],
        type: 'Income',
        category: item.category || item.source || 'Other',
        amount: item.amount || 0,
        description: item.description || ''
      });
    });

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}
