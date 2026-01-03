// Achievements Page
import authService from '../services/auth-service.js';
import gamificationService from '../services/gamification-service.js';
import { initSidebar } from '../utils/helpers.js';

// Category display names
const CATEGORY_NAMES = {
  getting_started: '🚀 Getting Started',
  consistency: '🔥 Consistency',
  savings: '💰 Savings Milestones',
  tracking: '📝 Tracking',
  budget: '💳 Budget Master',
  goals: '🎯 Goal Crusher',
  social: '👥 Social',
  special: '✨ Special'
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  authService.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    // Update user info
    updateUserInfo(user);
    
    // Initialize sidebar
    initSidebar();
    
    // Load gamification data
    await loadGamificationData();
    
    // Load achievements
    await loadAchievements();
    
    // Update streak
    await gamificationService.updateStreak();
  });
  
  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await authService.logout();
    window.location.href = 'login.html';
  });
});

function updateUserInfo(user) {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userName) userName.textContent = user.displayName || 'User';
  if (userEmail) userEmail.textContent = user.email;
  if (userAvatar) userAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
}

async function loadGamificationData() {
  try {
    const data = await gamificationService.getUserGamification();
    if (!data) return;
    
    const level = gamificationService.calculateLevel(data.points);
    const nextLevel = gamificationService.getNextLevel(data.points);
    
    // Update UI
    document.getElementById('levelIcon').textContent = level.icon;
    document.getElementById('levelName').textContent = level.name;
    document.getElementById('levelNumber').textContent = level.level;
    document.getElementById('totalPoints').textContent = data.points.toLocaleString();
    document.getElementById('streakValue').textContent = data.streak?.current || 0;
    document.getElementById('unlockedCount').textContent = data.achievements?.length || 0;
    
    // Progress to next level
    if (nextLevel) {
      const currentLevelMin = level.minPoints;
      const progress = ((data.points - currentLevelMin) / (nextLevel.minPoints - currentLevelMin)) * 100;
      
      document.getElementById('progressText').textContent = 
        `${data.points - currentLevelMin} / ${nextLevel.minPoints - currentLevelMin} points to next level`;
      document.getElementById('nextLevelName').textContent = nextLevel.name;
      document.getElementById('levelProgressFill').style.width = `${Math.min(progress, 100)}%`;
    } else {
      document.getElementById('progressText').textContent = 'Max level reached!';
      document.getElementById('nextLevelName').textContent = '🌟';
      document.getElementById('levelProgressFill').style.width = '100%';
    }
  } catch (error) {
    console.error('Error loading gamification data:', error);
  }
}

async function loadAchievements() {
  try {
    const achievementsByCategory = await gamificationService.getAchievementsByCategory();
    const container = document.getElementById('achievementsList');
    
    // Count totals
    let totalCount = 0;
    let unlockedCount = 0;
    
    let html = '';
    
    for (const [category, achievements] of Object.entries(achievementsByCategory)) {
      const categoryUnlocked = achievements.filter(a => a.unlocked).length;
      totalCount += achievements.length;
      unlockedCount += categoryUnlocked;
      
      html += `
        <div class="achievement-category">
          <div class="achievement-category-title">
            ${CATEGORY_NAMES[category] || category}
            <span class="achievement-category-count">${categoryUnlocked}/${achievements.length}</span>
          </div>
          <div class="achievements-grid">
            ${achievements.map(achievement => `
              <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                ${achievement.unlocked ? '<div class="achievement-unlocked-badge">✓</div>' : ''}
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-description">${achievement.description}</div>
                </div>
                <div class="achievement-points">+${achievement.points}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
    document.getElementById('totalAchievements').textContent = totalCount;
    
  } catch (error) {
    console.error('Error loading achievements:', error);
    document.getElementById('achievementsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3 class="empty-state-title">Error loading achievements</h3>
        <p class="empty-state-text">Please try refreshing the page.</p>
      </div>
    `;
  }
}
