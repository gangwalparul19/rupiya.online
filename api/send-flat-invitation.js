import nodemailer from 'nodemailer';

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_INVITATIONS_PER_WINDOW = 20;

function checkRateLimit(senderEmail) {
  const now = Date.now();
  const key = senderEmail.toLowerCase();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  const record = rateLimitMap.get(key);
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= MAX_INVITATIONS_PER_WINDOW) {
    return false;
  }
  record.count++;
  return true;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Get flat/home image
function getFlatImage() {
  // Use a nice home/apartment image
  return 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop';
}

// Generate flat living tips
function getFlatLivingTips() {
  return [
    '🏠 Set up a shared expense tracking system from day one',
    '🧹 Create a cleaning schedule that works for everyone',
    '🔊 Discuss noise levels and quiet hours early',
    '🍽️ Label your food or agree on shared groceries',
    '💰 Settle bills regularly to avoid confusion',
    '🤝 Have monthly flat meetings to address concerns',
    '🔑 Keep spare keys in a safe, agreed location',
    '📝 Document the flat condition when moving in'
  ];
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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      members, 
      flatName, 
      address,
      description,
      monthlyRent,
      creatorName, 
      creatorEmail,
      groupId 
    } = req.body;

    // Validate required fields
    if (!members || !Array.isArray(members) || !flatName || !creatorName || !groupId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Filter members with valid emails
    const membersWithEmail = members.filter(m => m.email && isValidEmail(m.email));
    
    if (membersWithEmail.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No valid emails to send' });
    }

    // Rate limit check
    if (!checkRateLimit(creatorEmail || creatorName)) {
      return res.status(429).json({ error: 'Too many invitations sent. Please try again later.' });
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

    const baseUrl = process.env.APP_URL || 'https://www.rupiya.online';
    const flatLink = `${baseUrl}/flat-group-detail.html?id=${encodeURIComponent(groupId)}`;
    
    // Escape user data
    const safeFlatName = escapeHtml(flatName);
    const safeAddress = escapeHtml(address || 'Your new flat');
    const safeDescription = escapeHtml(description || '');
    const safeCreatorName = escapeHtml(creatorName);
    
    // Get flat living tips and image
    const flatTips = getFlatLivingTips();
    const flatImage = getFlatImage();
    
    // Format rent
    const rentInfo = monthlyRent && monthlyRent > 0
      ? `₹${monthlyRent.toLocaleString('en-IN')}/month`
      : 'To be discussed';

    // Build member list HTML
    const allMembers = [{ name: creatorName, isCreator: true }, ...members];
    const memberListHtml = allMembers.map(m => `
      <div style="display: inline-block; margin: 4px; padding: 8px 12px; background: ${m.isCreator ? '#667eea' : '#f0f0f0'}; color: ${m.isCreator ? '#fff' : '#333'}; border-radius: 20px; font-size: 13px;">
        ${escapeHtml(m.name)}${m.isCreator ? ' 👑' : ''}
      </div>
    `).join('');

    // Build tips HTML
    const tipsHtml = flatTips.map(tip => `
      <li style="margin-bottom: 8px; color: #4a4a4a; font-size: 14px;">${escapeHtml(tip)}</li>
    `).join('');

    let sentCount = 0;
    const errors = [];

    for (const member of membersWithEmail) {
      const safeMemberName = escapeHtml(member.name);
      
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${flatImage}" alt="Flat" style="width: 100%; height: 200px; object-fit: cover; display: block;">
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 26px; font-weight: 700;">🏠 Welcome to Your Flat Group!</h1>
              <p style="margin: 10px 0 0; color: #667eea; font-size: 18px; font-weight: 600;">${safeFlatName}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hey <strong>${safeMemberName}</strong>! 👋
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${safeCreatorName}</strong> has added you to a flat expense group. Now you can easily track shared expenses, split bills, and manage your flat finances together!
              </p>
              
              ${safeDescription ? `<p style="margin: 0 0 20px; color: #6b6b6b; font-size: 15px; line-height: 1.6; font-style: italic;">"${safeDescription}"</p>` : ''}
              
              <!-- Flat Details Card -->
              <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #667eea30;">
                <table style="width: 100%;">
                  ${address ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b6b6b; font-size: 13px;">📍 ADDRESS</span><br>
                      <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">${safeAddress}</span>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b6b6b; font-size: 13px;">💰 MONTHLY RENT</span><br>
                      <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">${rentInfo}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Flatmates -->
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600;">👥 Your Flatmates</p>
                <div style="line-height: 2.2;">
                  ${memberListHtml}
                </div>
              </div>
              
              <!-- Flat Living Tips -->
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600;">💡 Tips for Happy Flat Sharing</p>
                <ul style="margin: 0; padding-left: 20px; list-style: none;">
                  ${tipsHtml}
                </ul>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 10px 0 20px;">
                    <a href="${flatLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      View Flat Group
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #9b9b9b; font-size: 13px; text-align: center;">
                Track rent, utilities, groceries, and all shared expenses in one place
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <table style="width: 100%;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #667eea; font-size: 18px; font-weight: 700;">Rupiya</p>
                    <p style="margin: 4px 0 0; color: #9b9b9b; font-size: 12px;">Smart Flat Expense Tracking</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; color: #9b9b9b; font-size: 12px;">© ${new Date().getFullYear()} Rupiya</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const textContent = `
Welcome to ${flatName}!

Hey ${member.name}!

${creatorName} has added you to a flat expense group. Now you can easily track shared expenses, split bills, and manage your flat finances together!

Flat Details:
${address ? `- Address: ${address}` : ''}
- Monthly Rent: ${rentInfo}
${description ? `- About: ${description}` : ''}

Your Flatmates: ${allMembers.map(m => m.name).join(', ')}

Tips for Happy Flat Sharing:
${flatTips.join('\n')}

View flat group and start tracking expenses: ${flatLink}

---
Rupiya - Smart Flat Expense Tracking
`;

      try {
        await transporter.sendMail({
          from: `"Rupiya Flats" <${gmailUser}>`,
          to: member.email,
          subject: `🏠 You've been added to ${safeFlatName}!`,
          text: textContent,
          html: htmlContent
        });
        sentCount++;
      } catch (err) {
        errors.push({ email: member.email, error: err.message });
      }
    }

    return res.status(200).json({ 
      success: true, 
      sent: sentCount,
      total: membersWithEmail.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error sending flat invitations:', error);
    return res.status(500).json({ error: 'Failed to send invitations', details: error.message });
  }
}
