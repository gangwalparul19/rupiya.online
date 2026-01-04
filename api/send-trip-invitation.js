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

// Get destination image from Unsplash
function getDestinationImage(destination) {
  const query = encodeURIComponent(destination + ' travel landscape');
  return `https://source.unsplash.com/800x400/?${query}`;
}

// Generate travel tips based on destination
function getTravelTips(destination) {
  const tips = {
    'goa': [
      '🏖️ Best beaches: Palolem, Anjuna, Baga',
      '🍽️ Try local Goan fish curry and bebinca',
      '🛵 Rent a scooter for easy exploration',
      '🌅 Don\'t miss sunset at Chapora Fort'
    ],
    'manali': [
      '🏔️ Visit Solang Valley for adventure sports',
      '🛕 Explore Hadimba Temple',
      '🧥 Pack warm clothes even in summer',
      '🚗 Take a trip to Rohtang Pass'
    ],
    'kerala': [
      '🛶 Houseboat stay in Alleppey backwaters',
      '🌿 Visit tea plantations in Munnar',
      '🐘 Periyar Wildlife Sanctuary',
      '💆 Try authentic Ayurvedic massage'
    ],
    'rajasthan': [
      '🏰 Explore forts of Jaipur, Jodhpur, Udaipur',
      '🐪 Desert safari in Jaisalmer',
      '🍛 Savor Dal Baati Churma',
      '🛍️ Shop for handicrafts and textiles'
    ],
    'paris': [
      '🗼 Book Eiffel Tower tickets in advance',
      '🥐 Start mornings with fresh croissants',
      '🎨 Spend a day at the Louvre',
      '🚶 Walk along the Seine at sunset'
    ],
    'bali': [
      '🛕 Visit Tanah Lot and Uluwatu temples',
      '🌾 Walk through Tegallalang rice terraces',
      '🏄 Try surfing at Kuta Beach',
      '🍜 Enjoy local Nasi Goreng'
    ],
    'thailand': [
      '🛕 Visit Grand Palace in Bangkok',
      '🏝️ Island hop in Phi Phi or Krabi',
      '🍜 Street food is a must-try',
      '🐘 Ethical elephant sanctuaries in Chiang Mai'
    ],
    'default': [
      '📱 Download offline maps before you go',
      '💳 Inform your bank about travel dates',
      '📷 Capture memories but stay present',
      '🎒 Pack light and leave room for souvenirs'
    ]
  };

  const dest = destination.toLowerCase();
  for (const [key, value] of Object.entries(tips)) {
    if (dest.includes(key)) return value;
  }
  return tips.default;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      members, 
      tripName, 
      destination,
      description,
      startDate, 
      endDate, 
      creatorName, 
      creatorEmail,
      groupId 
    } = req.body;

    // Validate required fields
    if (!members || !Array.isArray(members) || !tripName || !creatorName || !groupId) {
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
    const tripLink = `${baseUrl}/trip-group-detail.html?id=${encodeURIComponent(groupId)}`;
    
    // Escape user data
    const safeTripName = escapeHtml(tripName);
    const safeDestination = escapeHtml(destination || 'your destination');
    const safeDescription = escapeHtml(description || '');
    const safeCreatorName = escapeHtml(creatorName);
    
    // Get travel tips and image
    const travelTips = getTravelTips(destination || '');
    const destinationImage = getDestinationImage(destination || 'travel adventure');
    
    // Format dates
    const dateRange = startDate && endDate 
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : startDate 
        ? `Starting ${formatDate(startDate)}`
        : 'Dates to be confirmed';

    // Build member list HTML
    const allMembers = [{ name: creatorName, isCreator: true }, ...members];
    const memberListHtml = allMembers.map(m => `
      <div style="display: inline-block; margin: 4px; padding: 8px 12px; background: ${m.isCreator ? '#667eea' : '#f0f0f0'}; color: ${m.isCreator ? '#fff' : '#333'}; border-radius: 20px; font-size: 13px;">
        ${escapeHtml(m.name)}${m.isCreator ? ' 👑' : ''}
      </div>
    `).join('');

    // Build tips HTML
    const tipsHtml = travelTips.map(tip => `
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
              <img src="${destinationImage}" alt="${safeDestination}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 26px; font-weight: 700;">✈️ You're Invited!</h1>
              <p style="margin: 10px 0 0; color: #667eea; font-size: 18px; font-weight: 600;">${safeTripName}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hey <strong>${safeMemberName}</strong>! 👋
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${safeCreatorName}</strong> has added you to an exciting trip to <strong>${safeDestination}</strong>! Get ready for an amazing adventure.
              </p>
              
              ${safeDescription ? `<p style="margin: 0 0 20px; color: #6b6b6b; font-size: 15px; line-height: 1.6; font-style: italic;">"${safeDescription}"</p>` : ''}
              
              <!-- Trip Details Card -->
              <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #667eea30;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b6b6b; font-size: 13px;">📅 DATES</span><br>
                      <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">${dateRange}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b6b6b; font-size: 13px;">📍 DESTINATION</span><br>
                      <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">${safeDestination}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Fellow Travelers -->
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600;">👥 Fellow Travelers</p>
                <div style="line-height: 2.2;">
                  ${memberListHtml}
                </div>
              </div>
              
              <!-- Travel Tips -->
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600;">💡 Travel Tips for ${safeDestination}</p>
                <ul style="margin: 0; padding-left: 20px; list-style: none;">
                  ${tipsHtml}
                </ul>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 10px 0 20px;">
                    <a href="${tripLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      View Trip Details
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #9b9b9b; font-size: 13px; text-align: center;">
                Track expenses, split bills, and manage your trip budget together on Rupiya
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
                    <p style="margin: 4px 0 0; color: #9b9b9b; font-size: 12px;">Smart Trip Expense Tracking</p>
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
You're Invited to ${tripName}!

Hey ${member.name}!

${creatorName} has added you to an exciting trip to ${destination || 'an amazing destination'}!

Trip Details:
- Dates: ${dateRange}
- Destination: ${destination || 'TBD'}
${description ? `- About: ${description}` : ''}

Fellow Travelers: ${allMembers.map(m => m.name).join(', ')}

Travel Tips:
${travelTips.join('\n')}

View trip details and track expenses: ${tripLink}

---
Rupiya - Smart Trip Expense Tracking
`;

      try {
        await transporter.sendMail({
          from: `"Rupiya Trips" <${gmailUser}>`,
          to: member.email,
          subject: `✈️ You're invited to ${safeTripName}!`,
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
    console.error('Error sending trip invitations:', error);
    return res.status(500).json({ error: 'Failed to send invitations', details: error.message });
  }
}
