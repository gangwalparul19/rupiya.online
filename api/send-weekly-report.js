const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      userEmail, 
      userName, 
      currency,
      weeklyExpenses, 
      weeklyIncome, 
      totalExpenses, 
      totalIncome,
      expensesByCategory,
      incomeByCategory,
      transactions 
    } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing user email' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword }
    });

    // Generate CSV content
    const csvContent = generateCSV(transactions, currency);
    
    // Get week date range
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const dateRange = `${formatDate(weekStart)} - ${formatDate(today)}`;

    // Currency symbol
    const currencySymbol = getCurrencySymbol(currency);
    
    // Calculate savings
    const weeklySavings = weeklyIncome - weeklyExpenses;
    const savingsClass = weeklySavings >= 0 ? 'positive' : 'negative';

    const htmlContent = generateEmailHTML({
      userName, dateRange, currencySymbol,
      weeklyExpenses, weeklyIncome, weeklySavings, savingsClass,
      totalExpenses, totalIncome,
      expensesByCategory, incomeByCategory
    });

    const textContent = generateTextEmail({
      userName, dateRange, currencySymbol,
      weeklyExpenses, weeklyIncome, weeklySavings,
      totalExpenses, totalIncome
    });

    await transporter.sendMail({
      from: `"Rupiya" <${gmailUser}>`,
      to: userEmail,
      subject: `📊 Your Weekly Financial Report - ${dateRange}`,
      text: textContent,
      html: htmlContent,
      attachments: [{
        filename: `rupiya-report-${formatDateForFile(today)}.csv`,
        content: csvContent,
        contentType: 'text/csv'
      }]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending weekly report:', error);
    return res.status(500).json({ error: 'Failed to send report', details: error.message });
  }
}

function formatDate(date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateForFile(date) {
  return date.toISOString().split('T')[0];
}

function getCurrencySymbol(currency) {
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
  return symbols[currency] || '₹';
}

function formatAmount(amount, symbol) {
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateCSV(transactions, currency) {
  const symbol = getCurrencySymbol(currency);
  let csv = 'Date,Type,Category,Amount,Description\n';
  
  if (transactions && transactions.length > 0) {
    transactions.forEach(t => {
      const date = t.date || '';
      const type = t.type || '';
      const category = (t.category || '').replace(/"/g, '""');
      const amount = `${symbol}${t.amount || 0}`;
      const description = (t.description || '').replace(/"/g, '""');
      csv += `${date},${type},"${category}",${amount},"${description}"\n`;
    });
  }
  return csv;
}

function generateCategoryRows(categories, symbol, colorStart) {
  if (!categories || Object.keys(categories).length === 0) {
    return '<tr><td colspan="2" style="padding: 8px; color: #6b6b6b; text-align: center;">No data</td></tr>';
  }
  
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt], i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${colors[i % colors.length]}; margin-right: 8px;"></span>
          ${cat}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 500;">${formatAmount(amt, symbol)}</td>
      </tr>
    `).join('');
}


function generateEmailHTML({ userName, dateRange, currencySymbol, weeklyExpenses, weeklyIncome, weeklySavings, savingsClass, totalExpenses, totalIncome, expensesByCategory, incomeByCategory }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Financial Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">📊 Weekly Report</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">${dateRange}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #1a1a1a; font-size: 18px;">Hi ${userName || 'there'} 👋</p>
              <p style="margin: 10px 0 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">Here's your weekly financial summary. Keep up the great work managing your finances!</p>
            </td>
          </tr>
          
          <!-- Weekly Summary Cards -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 33%; padding: 5px;">
                    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="margin: 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Expenses</p>
                      <p style="margin: 8px 0 0; color: #ffffff; font-size: 20px; font-weight: 700;">${formatAmount(weeklyExpenses, currencySymbol)}</p>
                    </div>
                  </td>
                  <td style="width: 33%; padding: 5px;">
                    <div style="background: linear-gradient(135deg, #51cf66 0%, #40c057 100%); border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="margin: 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Income</p>
                      <p style="margin: 8px 0 0; color: #ffffff; font-size: 20px; font-weight: 700;">${formatAmount(weeklyIncome, currencySymbol)}</p>
                    </div>
                  </td>
                  <td style="width: 33%; padding: 5px;">
                    <div style="background: linear-gradient(135deg, ${savingsClass === 'positive' ? '#667eea, #764ba2' : '#ff8787, #fa5252'}); border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="margin: 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Savings</p>
                      <p style="margin: 8px 0 0; color: #ffffff; font-size: 20px; font-weight: 700;">${weeklySavings >= 0 ? '+' : ''}${formatAmount(weeklySavings, currencySymbol)}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Category Breakdown -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; padding-right: 10px; vertical-align: top;">
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">💸 Top Expenses</h3>
                      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        ${generateCategoryRows(expensesByCategory, currencySymbol, 0)}
                      </table>
                    </div>
                  </td>
                  <td style="width: 50%; padding-left: 10px; vertical-align: top;">
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                      <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">💰 Income Sources</h3>
                      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        ${generateCategoryRows(incomeByCategory, currencySymbol, 4)}
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Overall Stats -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; padding: 20px; border-left: 4px solid #667eea;">
                <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📈 All-Time Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4a4a4a;">Total Expenses:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #ff6b6b;">${formatAmount(totalExpenses, currencySymbol)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a4a4a;">Total Income:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #51cf66;">${formatAmount(totalIncome, currencySymbol)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a4a4a; border-top: 1px solid #dee2e6;">Net Balance:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${(totalIncome - totalExpenses) >= 0 ? '#667eea' : '#ff6b6b'}; border-top: 1px solid #dee2e6;">${formatAmount(totalIncome - totalExpenses, currencySymbol)}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <a href="https://www.rupiya.online/dashboard.html" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">View Full Dashboard</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; color: #6b6b6b; font-size: 13px; text-align: center;">📎 A CSV file with your detailed transactions is attached.</p>
              <p style="margin: 0; color: #9b9b9b; font-size: 12px; text-align: center;">You can disable weekly reports in your <a href="https://www.rupiya.online/profile.html" style="color: #667eea;">profile settings</a>.</p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 20px 0 0; color: #9b9b9b; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Rupiya. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateTextEmail({ userName, dateRange, currencySymbol, weeklyExpenses, weeklyIncome, weeklySavings, totalExpenses, totalIncome }) {
  return `
Weekly Financial Report - ${dateRange}

Hi ${userName || 'there'},

Here's your weekly financial summary:

WEEKLY SUMMARY
--------------
Expenses: ${formatAmount(weeklyExpenses, currencySymbol)}
Income: ${formatAmount(weeklyIncome, currencySymbol)}
Savings: ${weeklySavings >= 0 ? '+' : ''}${formatAmount(weeklySavings, currencySymbol)}

ALL-TIME SUMMARY
----------------
Total Expenses: ${formatAmount(totalExpenses, currencySymbol)}
Total Income: ${formatAmount(totalIncome, currencySymbol)}
Net Balance: ${formatAmount(totalIncome - totalExpenses, currencySymbol)}

View your full dashboard: https://www.rupiya.online/dashboard.html

A CSV file with your detailed transactions is attached.

---
You can disable weekly reports in your profile settings.
© ${new Date().getFullYear()} Rupiya. All rights reserved.
`;
}
