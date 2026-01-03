// Gamification UI Components - Toasts, Level Up, Streak Display
import gamificationService from '../services/gamification-service.js';

class GamificationUI {
  constructor() {
    this.toastQueue = [];
    this.isShowingToast = false;
  }

  // Show achievement unlocked toast
  showAchievementToast(achievement) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-icon">${achievement.icon}</div>
      <div class="achievement-toast-content">
        <h4>🎉 Achievement Unlocked!</h4>
        <p>${achievement.name}</p>
      </div>
      <div class="achievement-toast-points">+${achievement.points} pts</div>
    `;
    
    document.body.appendChild(toast);
    
    // Play sound if available
    this.playSound('achievement');
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'achievementSlideIn 0.5s ease-out reverse';
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  // Show level up celebration
  showLevelUp(newLevel) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-toast';
    overlay.innerHTML = `
      <div class="level-up-toast-icon">${newLevel.icon}</div>
      <h3>Level Up!</h3>
      <p>You're now a ${newLevel.name}</p>
    `;
    
    document.body.appendChild(overlay);
    
    // Play sound
    this.playSound('levelup');
    
    // Add confetti effect
    this.showConfetti();
    
    // Remove after 4 seconds
    setTimeout(() => {
      overlay.style.animation = 'levelUpZoom 0.4s ease-out reverse';
      setTimeout(() => overlay.remove(), 400);
    }, 4000);
  }

  // Simple confetti effect
  showConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        z-index: 10002;
        animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
      `;
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4000);
    }
    
    // Add confetti animation if not exists
    if (!document.getElementById('confettiStyle')) {
      const style = document.createElement('style');
      style.id = 'confettiStyle';
      style.textContent = `
        @keyframes confettiFall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Play sound effect
  playSound(type) {
    // Could implement actual sounds here
    // For now, just log
    console.log(`[Sound] ${type}`);
  }

  // Create streak display element
  createStreakDisplay(streak) {
    const display = document.createElement('div');
    display.className = 'streak-display';
    display.innerHTML = `
      <span class="streak-display-icon">🔥</span>
      <span>${streak} day${streak !== 1 ? 's' : ''}</span>
    `;
    return display;
  }

  // Create level badge element
  createLevelBadge(level) {
    const badge = document.createElement('div');
    badge.className = 'level-badge';
    badge.innerHTML = `
      <span class="level-badge-icon">${level.icon}</span>
      <span>Lv.${level.level} ${level.name}</span>
    `;
    return badge;
  }

  // Create gamification widget for dashboard
  async createDashboardWidget() {
    const data = await gamificationService.getUserGamification();
    if (!data) return null;
    
    const level = gamificationService.calculateLevel(data.points);
    const nextLevel = gamificationService.getNextLevel(data.points);
    
    const widget = document.createElement('div');
    widget.className = 'gamification-widget';
    
    let progressPercent = 0;
    let progressText = 'Max level reached!';
    
    if (nextLevel) {
      const currentLevelMin = level.minPoints;
      progressPercent = ((data.points - currentLevelMin) / (nextLevel.minPoints - currentLevelMin)) * 100;
      progressText = `${nextLevel.pointsNeeded} pts to ${nextLevel.name}`;
    }
    
    widget.innerHTML = `
      <div class="gamification-header">
        <div class="gamification-level">
          <div class="gamification-level-icon">${level.icon}</div>
          <div class="gamification-level-info">
            <h4>${level.name}</h4>
            <p>Level ${level.level}</p>
          </div>
        </div>
        <div class="gamification-points">
          <div class="gamification-points-value">${data.points}</div>
          <div class="gamification-points-label">Points</div>
        </div>
      </div>
      <div class="gamification-progress">
        <div class="gamification-progress-text">
          <span>${progressText}</span>
          <span>${Math.round(progressPercent)}%</span>
        </div>
        <div class="level-progress">
          <div class="level-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>
      <div class="gamification-stats">
        <div class="gamification-stat">
          <div class="gamification-stat-value">${data.streak?.current || 0}</div>
          <div class="gamification-stat-label">🔥 Streak</div>
        </div>
        <div class="gamification-stat">
          <div class="gamification-stat-value">${data.achievements?.length || 0}</div>
          <div class="gamification-stat-label">🏅 Badges</div>
        </div>
      </div>
    `;
    
    // Make widget clickable to go to achievements page
    widget.style.cursor = 'pointer';
    widget.addEventListener('click', () => {
      window.location.href = 'achievements.html';
    });
    
    return widget;
  }

  // Check and show any pending achievement notifications
  async checkAndNotify(result) {
    if (!result || !result.success) return;
    
    if (result.achievement) {
      this.showAchievementToast(result.achievement);
    }
    
    if (result.levelUp) {
      setTimeout(() => {
        this.showLevelUp(result.newLevel);
      }, 1000);
    }
  }
}

const gamificationUI = new GamificationUI();
export default gamificationUI;
