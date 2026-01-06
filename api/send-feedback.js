import nodemailer from 'nodemailer';

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 feedback submissions per hour per email

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  const record = rateLimitMap.get(key);
  
  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  // Check if limit exceeded
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  // Increment count
  record.count++;
  return true;
}

// Helper function to escape HTML to prevent XSS in emails
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Helper function to validate email format
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, subject, message, email, userName, userId, timestamp, userAgent } = req.body;

    // Validate required fields
    if (!type || !subject || !message || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate userId is provided (ensures user is logged in)
    if (!userId || userId.length < 10) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Check rate limit
    if (!checkRateLimit(email)) {
      return res.status(429).json({ error: 'Too many feedback submissions. Please try again later.' });
    }
    
    // Validate input lengths to prevent abuse
    if (subject.length > 200) {
      return res.status(400).json({ error: 'Subject too long (max 200 characters)' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    // Get Gmail credentials from environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const feedbackEmail = process.env.FEEDBACK_EMAIL || gmailUser; // Email to receive feedback

    if (!gmailUser || !gmailAppPassword) {
      console.error('Gmail credentials not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    // Get feedback type label and icon
    const typeLabels = {
      bug: '🐛 Bug Report',
      feature: '💡 Feature Request',
      improvement: '✨ Improvement Suggestion',
      general: '💬 General Feedback',
      other: '📝 Other'
    };
    const typeLabel = typeLabels[type] || type;

    // Email HTML template (escape user input to prevent XSS)
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);
    const safeUserName = escapeHtml(userName);
    const safeEmail = escapeHtml(email);
    const safeUserId = escapeHtml(userId);
    const safeUserAgent = escapeHtml(userAgent);
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rupiya Feedback</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Rupiya Feedback</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">${typeLabel}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px; font-weight: 600;">${safeSubject}</h2>
              
              <div style="padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea; margin-bottom: 24px;">
                <p style="margin: 0; color: #4a4a4a; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${safeMessage}</p>
              </div>
              
              <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px;">
                <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px; font-weight: 600;">User Information</h3>
                <table style="width: 100%; font-size: 14px; color: #4a4a4a;">
                  <tr>
                    <td style="padding: 6px 0;"><strong>Name:</strong></td>
                    <td style="padding: 6px 0;">${safeUserName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;"><strong>Email:</strong></td>
                    <td style="padding: 6px 0;">${safeEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;"><strong>User ID:</strong></td>
                    <td style="padding: 6px 0; font-family: monospace; font-size: 12px;">${safeUserId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;"><strong>Timestamp:</strong></td>
                    <td style="padding: 6px 0;">${new Date(timestamp).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top;"><strong>User Agent:</strong></td>
                    <td style="padding: 6px 0; font-size: 12px; word-break: break-all;">${safeUserAgent}</td>
                  </tr>
                </table>
              </div>
              
              <div style="margin-top: 24px; padding: 16px; background-color: #e3f2fd; border-radius: 6px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>Action Required:</strong> Please review this feedback and respond if necessary.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6b6b6b; font-size: 13px; text-align: center;">
                This feedback was submitted through Rupiya Feedback System
              </p>
              <p style="margin: 8px 0 0; color: #9b9b9b; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Rupiya. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain text version
    const textContent = `
Rupiya Feedback - ${typeLabel}

Subject: ${subject}

Message:
${message}

---
User Information:
Name: ${userName}
Email: ${email}
User ID: ${userId}
Timestamp: ${new Date(timestamp).toLocaleString()}
User Agent: ${userAgent}

---
This feedback was submitted through Rupiya Feedback System.
© ${new Date().getFullYear()} Rupiya. All rights reserved.
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"Rupiya Feedback" <${gmailUser}>`,
      to: feedbackEmail,
      replyTo: email, // Allow replying directly to user
      subject: `[Rupiya Feedback] ${typeLabel}: ${subject}`,
      text: textContent,
      html: htmlContent
    });

    console.log('Feedback email sent:', info.messageId);

    // Send confirmation email to user
    const confirmationHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Thank You!</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">We've received your feedback</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${safeUserName},
              </p>
              <p style="margin: 0 0 16px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for taking the time to share your feedback with us. We've received your ${typeLabel.toLowerCase()} and our team will review it carefully.
              </p>
              <div style="padding: 20px; background-color: #f8f9fa; border-radius: 6px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #1a1a1a; font-weight: 600;">Your Feedback:</p>
                <p style="margin: 0; color: #4a4a4a; font-size: 14px;"><strong>Subject:</strong> ${safeSubject}</p>
              </div>
              <p style="margin: 0 0 16px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                We typically respond within 24-48 hours for bug reports and within a week for feature requests. If your feedback requires a response, we'll get back to you at ${safeEmail}.
              </p>
              <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong>The Rupiya Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #9b9b9b; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Rupiya. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send confirmation to user
    await transporter.sendMail({
      from: `"Rupiya" <${gmailUser}>`,
      to: email,
      subject: 'We received your feedback - Rupiya',
      html: confirmationHtml
    });

    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Error sending feedback email:', error);
    return res.status(500).json({ 
      error: 'Failed to send feedback',
      details: error.message 
    });
  }
}
