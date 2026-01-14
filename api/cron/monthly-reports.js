import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting monthly reports cron job...');
    
    // Get all users who have opted in for monthly reports
    const prefsSnapshot = await db.collection('userPreferences')
      .where('monthlyReportEnabled', '==', true)
      .get();

    if (prefsSnapshot.empty) {
      console.log('No users opted in for monthly reports');
      return res.status(200).json({ message: 'No users to process', count: 0 });
    }

    const results = [];
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const monthName = lastMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    for (const prefDoc of prefsSnapshot.docs) {
      const prefs = prefDoc.data();
      const userId = prefs.userId;

      try {
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.log(`User ${userId} not found, skipping`);
          continue;
        }

        const userData = userDoc.data();
        const userEmail = userData.email;
        const userName = userData.displayName || 'User';
        const currency = prefs.currency || 'INR';

        // Get monthly expenses
        const expensesSnapshot = await db.collection('users').doc(userId)
          .collection('expenses')
          .where('date', '>=', Timestamp.fromDate(lastMonthStart))
          .where('date', '<=', Timestamp.fromDate(lastMonthEnd))
          .get();

        // Get monthly income
        const incomeSnapshot = await db.collection('users').doc(userId)
          .collection('income')
          .where('date', '>=', Timestamp.fromDate(lastMonthStart))
          .where('date', '<=', Timestamp.fromDate(lastMonthEnd))
          .get();

        // Calculate totals
        let monthlyExpenses = 0;
        let monthlyIncome = 0;
        const expensesByCategory = {};
        const incomeByCategory = {};
        const transactions = [];

        expensesSnapshot.forEach(doc => {
          const expense = doc.data();
          monthlyExpenses += expense.amount || 0;
          const cat = expense.category || 'Other';
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + expense.amount;
          transactions.push({
            type: 'Expense',
            category: expense.category,
            amount: expense.amount,
            description: expense.description || '',
            date: expense.date?.toDate?.().toISOString().split('T')[0] || ''
          });
        });

        incomeSnapshot.forEach(doc => {
          const income = doc.data();
          monthlyIncome += income.amount || 0;
          const src = income.source || 'Other';
          incomeByCategory[src] = (incomeByCategory[src] || 0) + income.amount;
          transactions.push({
            type: 'Income',
            category: income.source,
            amount: income.amount,
            description: income.description || '',
            date: income.date?.toDate?.().toISOString().split('T')[0] || ''
          });
        });

        // Get all-time totals
        const allExpensesSnapshot = await db.collection('users').doc(userId)
          .collection('expenses').get();
        const allIncomeSnapshot = await db.collection('users').doc(userId)
          .collection('income').get();

        let totalExpenses = 0;
        let totalIncome = 0;
        allExpensesSnapshot.forEach(doc => totalExpenses += doc.data().amount || 0);
        allIncomeSnapshot.forEach(doc => totalIncome += doc.data().amount || 0);

        // Send the report
        const appUrl = process.env.APP_URL || 'https://www.rupiya.online';
        const reportUrl = `${appUrl}/api/send-monthly-report`;
        
        console.log(`Sending report to ${reportUrl} for user ${userEmail}`);
        
        const reportResponse = await fetch(reportUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({
            userEmail,
            userName,
            currency,
            monthName,
            monthlyExpenses,
            monthlyIncome,
            totalExpenses,
            totalIncome,
            expensesByCategory,
            incomeByCategory,
            transactions
          })
        });

        if (!reportResponse.ok) {
          const error = await reportResponse.text();
          results.push({ userId, email: userEmail, status: 'failed', error, statusCode: reportResponse.status });
          console.error(`Failed to send report to ${userEmail}: ${reportResponse.status} - ${error}`);
          continue;
        }

        results.push({ userId, email: userEmail, status: 'sent' });
        console.log(`Monthly report sent to ${userEmail}`);

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        results.push({ userId, status: 'error', error: userError.message });
      }
    }

    console.log('Monthly reports cron job completed');
    return res.status(200).json({
      message: 'Monthly reports processed',
      count: results.length,
      results
    });

  } catch (error) {
    console.error('Monthly reports cron error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
