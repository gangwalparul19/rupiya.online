import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  try {
    // Try to initialize with service account (production)
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;
    
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Fallback to default credentials (development)
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Continue without Firebase - will fall back to in-memory rate limiting
  }
}

const db = getApps().length > 0 ? getFirestore() : null;

// Fallback in-memory rate limiting (used if Firestore is unavailable)
const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_INVITATIONS_PER_WINDOW = 10; // Max 10 invitations per hour per sender

/**
 * Check rate limit using Firestore (persistent) or in-memory (fallback)
 */
async function checkRateLimit(senderEmail) {
  const key = senderEmail.toLowerCase();
  const now = Date.now();
  
  // Try Firestore first (persistent rate limiting)
  if (db) {
    try {
      const rateLimitRef = db.collection('rateLimits').doc(key);
      const rateLimitDoc = await rateLimitRef.get();
      
      if (!rateLimitDoc.exists) {
        // First request from this sender
        await rateLimitRef.set({
          count: 1,
          windowStart: now,
          lastRequest: now,
          email: senderEmail
        });
        return true;
      }
      
      const data = rateLimitDoc.data();
      
      // Reset window if expired
      if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        await rateLimitRef.set({
          count: 1,
          windowStart: now,
          lastRequest: now,
          email: senderEmail
        });
        return true;
      }
      
      // Check if limit exceeded
      if (data.count >= MAX_INVITATIONS_PER_WINDOW) {
        console.warn(`Rate limit exceeded for ${senderEmail}: ${data.count} requests in window`);
        return false;
      }
      
      // Increment count
      await rateLimitRef.update({
        count: data.count + 1,
        lastRequest: now
      });
      
      return true;
    } catch (firestoreError) {
      console.error('Firestore rate limit check failed, falling back to in-memory:', firestoreError);
      // Fall through to in-memory rate limiting
    }
  }
  
  // Fallback to in-memory rate limiting
  try {
    const record = rateLimitStore.get(key);
    
    if (!record) {
      // First request from this sender
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    
    // Reset window if expired
    if (now - record.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    
    // Check if limit exceeded
    if (record.count >= MAX_INVITATIONS_PER_WINDOW) {
      console.warn(`Rate limit exceeded (in-memory) for ${senderEmail}: ${record.count} requests`);
      return false;
    }
    
    // Increment count
    record.count++;
    rateLimitStore.set(key, record);
    
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if rate limit check fails
    return true;
  }
}

// Helper function to escape HTML to prevent XSS
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
  // Set CORS headers - restrict to allowed origins only
  const allowedOrigins = [
    'https://rupiya.online',
    'https://www.rupiya.online',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (origin) {
    // Log unauthorized origin attempts for security monitoring
    console.warn(`Unauthorized CORS request from origin: ${origin}`);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
    const { invitedEmail, invitedByName, invitedByEmail, groupName, invitationId } = req.body;

    // Validate required fields
    if (!invitedEmail || !invitedByName || !groupName || !invitationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate email format
    if (!isValidEmail(invitedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate against email header injection (newline characters)
    if (invitedEmail.includes('\n') || invitedEmail.includes('\r')) {
      console.warn(`Email injection attempt detected: ${invitedEmail}`);
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate against header injection in names and group name
    if (invitedByName.includes('\n') || invitedByName.includes('\r')) {
      console.warn(`Header injection attempt in name: ${invitedByName}`);
      return res.status(400).json({ error: 'Invalid name format' });
    }
    
    if (groupName.includes('\n') || groupName.includes('\r')) {
      console.warn(`Header injection attempt in group name: ${groupName}`);
      return res.status(400).json({ error: 'Invalid group name format' });
    }
    
    // Validate invitedByEmail if provided
    if (invitedByEmail && (invitedByEmail.includes('\n') || invitedByEmail.includes('\r'))) {
      console.warn(`Email injection attempt in sender email: ${invitedByEmail}`);
      return res.status(400).json({ error: 'Invalid sender email format' });
    }
    
    // Validate invitationId format (Firebase document IDs are alphanumeric, 20 chars)
    if (!invitationId || typeof invitationId !== 'string' || invitationId.length < 10 || invitationId.length > 50) {
      return res.status(400).json({ error: 'Invalid invitation ID format' });
    }
    
    // Additional validation: invitationId should only contain safe characters
    if (!/^[a-zA-Z0-9_-]+$/.test(invitationId)) {
      console.warn(`Invalid invitation ID format: ${invitationId}`);
      return res.status(400).json({ error: 'Invalid invitation ID format' });
    }
    
    // Validate input lengths
    if (invitedByName.length > 100 || groupName.length > 100) {
      return res.status(400).json({ error: 'Name or group name too long' });
    }
    
    // Check rate limit (use invitedByEmail if provided, otherwise use a hash of invitedByName)
    const rateLimitKey = invitedByEmail || `name:${invitedByName}`;
    const isWithinLimit = await checkRateLimit(rateLimitKey);
    if (!isWithinLimit) {
      return res.status(429).json({ error: 'Too many invitations sent. Please try again later.' });
    }

    // Get Gmail credentials from environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

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

    // Generate invitation link - Use custom domain or fallback
    const baseUrl = process.env.APP_URL || 'https://www.rupiya.online';
    const invitationLink = `${baseUrl}/family.html?invitation=${encodeURIComponent(invitationId)}`;
    
    // Escape user-provided data for HTML
    const safeInvitedByName = escapeHtml(invitedByName);
    const safeGroupName = escapeHtml(groupName);

    // Email HTML template
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Rupiya</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Family Finance Management</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">You're Invited! 🎉</h2>
              
              <p style="margin: 0 0 16px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${safeInvitedByName}</strong> has invited you to join the family group <strong>"${safeGroupName}"</strong> on Rupiya.
              </p>
              
              <p style="margin: 0 0 24px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                By joining this family group, you'll be able to:
              </p>
              
              <ul style="margin: 0 0 32px; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                <li>Track shared expenses and income</li>
                <li>Collaborate on family budgets</li>
                <li>View consolidated financial insights</li>
                <li>Manage household finances together</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${invitationLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea; margin-bottom: 24px;">
                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                  <strong>Note:</strong> This invitation will expire in 7 days. If you don't have a Rupiya account yet, you'll be able to create one when you accept the invitation.
                </p>
              </div>
              
              <p style="margin: 0 0 8px; color: #6b6b6b; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #667eea; font-size: 13px; word-break: break-all;">
                ${invitationLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; color: #6b6b6b; font-size: 13px; text-align: center;">
                This invitation was sent by ${safeInvitedByName} through Rupiya
              </p>
              <p style="margin: 0; color: #9b9b9b; font-size: 12px; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer Links -->
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="text-align: center; padding: 0 20px;">
              <p style="margin: 0; color: #9b9b9b; font-size: 12px;">
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

    // Plain text version (no escaping needed for plain text)
    const textContent = `
You're Invited to Join ${groupName} on Rupiya!

${invitedByName} has invited you to join their family group "${groupName}" on Rupiya.

By joining this family group, you'll be able to:
- Track shared expenses and income
- Collaborate on family budgets
- View consolidated financial insights
- Manage household finances together

Accept your invitation by clicking this link:
${invitationLink}

Note: This invitation will expire in 7 days. If you don't have a Rupiya account yet, you'll be able to create one when you accept the invitation.

---
This invitation was sent by ${invitedByName} through Rupiya.
If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Rupiya. All rights reserved.
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"Rupiya" <${gmailUser}>`,
      to: invitedEmail,
      subject: `You're invited to join ${groupName} on Rupiya`,
      text: textContent,
      html: htmlContent
    });

    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return res.status(500).json({ 
      error: 'Failed to send invitation email'
    });
  }
}
