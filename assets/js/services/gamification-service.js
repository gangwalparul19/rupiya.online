// Gamification Service - Achievement Badges, Streaks, and Progress Levels
import { db } from '../config/firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

// Achievement Definitions
const ACHIEVEMENTS = {
  // Getting Started
  first_expense: {
    id: 'first_expense',
    name: 'First Step',
    description: 'Added your first expense',
    icon: '🎯',
    category: 'getting_started',
    points: 10
  },
  first_income: {
    id: 'first_income',
    name: 'Money Maker',
    description: 'Recorded your first income',
    icon: '💵',
    category: 'getting_started',
    points: 10
  },
  first_budget: {
    id: 'first_budget',
    name: 'Budget Boss',
    description: 'Created your first budget',
    icon: '📊',
    category: 'getting_started',
    points: 15
  },
  first_goal: {
    id: 'first_goal',
    name: 'Goal Setter',
    description: 'Set your first financial goal',
    icon: '🎯',
    category: 'getting_started',
    points: 15
  },
  profile_complete: {
    id: 'profile_complete',
    name: 'Identity Verified',
    description: 'Completed your profile',
    icon: '✅',
    category: 'getting_started',
    points: 20
  },

  // Consistency
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day login streak',
    icon: '🔥',
    category: 'consistency',
    points: 25
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day login streak',
    icon: '⚡',
    category: 'consistency',
    points: 100
  },
  streak_100: {
    id: 'streak_100',
    name: 'Century Club',
    description: '100-day login streak',
    icon: '💯',
    category: 'consistency',
    points: 500
  },

  // Savings Milestones
  saved_1k: {
    id: 'saved_1k',
    name: 'Saver Starter',
    description: 'Saved ₹1,000',
    icon: '💰',
    category: 'savings',
    points: 20
  },
  saved_10k: {
    id: 'saved_10k',
    name: 'Smart Saver',
    description: 'Saved ₹10,000',
    icon: '🏦',
    category: 'savings',
    points: 50
  },
  saved_50k: {
    id: 'saved_50k',
    name: 'Wealth Builder',
    description: 'Saved ₹50,000',
    icon: '💎',
    category: 'savings',
    points: 100
  },
  saved_1l: {
    id: 'saved_1l',
    name: 'Lakhpati',
    description: 'Saved ₹1,00,000',
    icon: '👑',
    category: 'savings',
    points: 250
  },

  // Tracking
  expenses_10: {
    id: 'expenses_10',
    name: 'Tracker',
    description: 'Logged 10 expenses',
    icon: '📝',
    category: 'tracking',
    points: 15
  },
  expenses_50: {
    id: 'expenses_50',
    name: 'Diligent Tracker',
    description: 'Logged 50 expenses',
    icon: '📋',
    category: 'tracking',
    points: 30
  },
  expenses_100: {
    id: 'expenses_100',
    name: 'Master Tracker',
    description: 'Logged 100 expenses',
    icon: '🏆',
    category: 'tracking',
    points: 75
  },
  expenses_500: {
    id: 'expenses_500',
    name: 'Expense Expert',
    description: 'Logged 500 expenses',
    icon: '🌟',
    category: 'tracking',
    points: 200
  },

  // Budget
  budget_under: {
    id: 'budget_under',
    name: 'Under Budget',
    description: 'Stayed under budget for a month',
    icon: '✨',
    category: 'budget',
    points: 50
  },
  budget_3months: {
    id: 'budget_3months',
    name: 'Budget Pro',
    description: 'Under budget for 3 consecutive months',
    icon: '🎖️',
    category: 'budget',
    points: 150
  },

  // Goals
  goal_achieved: {
    id: 'goal_achieved',
    name: 'Goal Crusher',
    description: 'Achieved your first goal',
    icon: '🏅',
    category: 'goals',
    points: 100
  },
  goals_3: {
    id: 'goals_3',
    name: 'Triple Threat',
    description: 'Achieved 3 goals',
    icon: '🥇',
    category: 'goals',
    points: 250
  },

  // Social
  family_created: {
    id: 'family_created',
    name: 'Family First',
    description: 'Created a family group',
    icon: '👨‍👩‍👧‍👦',
    category: 'social',
    points: 25
  },
  family_invited: {
    id: 'family_invited',
    name: 'Team Builder',
    description: 'Invited someone to your family',
    icon: '🤝',
    category: 'social',
    points: 15
  },

  // Special
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined Rupiya in 2024-2026',
    icon: '🚀',
    category: 'special',
    points: 50
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Logged expense after midnight',
    icon: '🦉',
    category: 'special',
    points: 10
  },
  weekend_warrior: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Logged expenses on 4 consecutive weekends',
    icon: '🎉',
    category: 'special',
    points: 30
  }
};

// Level Definitions
const LEVELS = [
  { level: 1, name: 'Finance Newbie', minPoints: 0, icon: '🌱' },
  { level: 2, name: 'Budget Beginner', minPoints: 50, icon: '🌿' },
  { level: 3, name: 'Money Tracker', minPoints: 150, icon: '📊' },
  { level: 4, name: 'Savings Starter', minPoints: 300, icon: '💰' },
  { level: 5, name: 'Finance Apprentice', minPoints: 500, icon: '📈' },
  { level: 6, name: 'Budget Pro', minPoints: 750, icon: '⭐' },
  { level: 7, name: 'Wealth Builder', minPoints: 1000, icon: '💎' },
  { level: 8, name: 'Money Master', minPoints: 1500, icon: '🏆' },
  { level: 9, name: 'Finance Guru', minPoints: 2000, icon: '👑' },
  { level: 10, name: 'Rupiya Legend', minPoints: 3000, icon: '🌟' }
];

class GamificationService {
  constructor() {
    this.achievements = ACHIEVEMENTS;
    this.levels = LEVELS;
  }

  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Get user's gamification data
  async getUserGamification() {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'gamification', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // Initialize gamification data for new user
        const initialData = {
          points: 0,
          level: 1,
          achievements: [],
          streak: {
            current: 0,
            longest: 0,
            lastLogin: null
          },
          stats: {
            totalExpenses: 0,
            totalIncome: 0,
            totalSaved: 0,
            goalsAchieved: 0,
            budgetsUnderCount: 0
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        await setDoc(docRef, initialData);
        return initialData;
      }
    } catch (error) {
      console.error('Error getting gamification data:', error);
      return null;
    }
  }

  // Update streak on login
  async updateStreak() {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'gamification', userId);
      const data = await this.getUserGamification();
      
      if (!data) return null;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastLogin = data.streak.lastLogin?.toDate();
      
      let newStreak = data.streak.current;
      
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
        const diffDays = Math.floor((today - lastLoginDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          newStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }
        // If diffDays === 0, same day login, don't change streak
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(newStreak, data.streak.longest);

      await updateDoc(docRef, {
        'streak.current': newStreak,
        'streak.longest': longestStreak,
        'streak.lastLogin': Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Check streak achievements
      await this.checkStreakAchievements(newStreak);

      return { current: newStreak, longest: longestStreak };
    } catch (error) {
      console.error('Error updating streak:', error);
      return null;
    }
  }

  // Check and award streak achievements
  async checkStreakAchievements(streak) {
    if (streak >= 7) await this.unlockAchievement('streak_7');
    if (streak >= 30) await this.unlockAchievement('streak_30');
    if (streak >= 100) await this.unlockAchievement('streak_100');
  }

  // Unlock an achievement
  async unlockAchievement(achievementId) {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'gamification', userId);
      const data = await this.getUserGamification();
      
      if (!data) return { success: false };

      // Check if already unlocked
      if (data.achievements.includes(achievementId)) {
        return { success: false, alreadyUnlocked: true };
      }

      const achievement = this.achievements[achievementId];
      if (!achievement) return { success: false };

      const newPoints = data.points + achievement.points;
      const newLevel = this.calculateLevel(newPoints);

      await updateDoc(docRef, {
        achievements: [...data.achievements, achievementId],
        points: newPoints,
        level: newLevel.level,
        updatedAt: Timestamp.now()
      });

      return {
        success: true,
        achievement,
        newPoints,
        newLevel,
        levelUp: newLevel.level > data.level
      };
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate level from points
  calculateLevel(points) {
    let currentLevel = this.levels[0];
    for (const level of this.levels) {
      if (points >= level.minPoints) {
        currentLevel = level;
      } else {
        break;
      }
    }
    return currentLevel;
  }

  // Get next level info
  getNextLevel(currentPoints) {
    const currentLevel = this.calculateLevel(currentPoints);
    const nextLevelIndex = this.levels.findIndex(l => l.level === currentLevel.level) + 1;
    
    if (nextLevelIndex >= this.levels.length) {
      return null; // Max level reached
    }

    const nextLevel = this.levels[nextLevelIndex];
    return {
      ...nextLevel,
      pointsNeeded: nextLevel.minPoints - currentPoints
    };
  }

  // Update stats and check achievements
  async updateStats(statType, value = 1) {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'gamification', userId);
      const data = await this.getUserGamification();
      
      if (!data) return;

      const newStats = { ...data.stats };
      
      switch (statType) {
        case 'expense':
          newStats.totalExpenses += value;
          await this.checkExpenseAchievements(newStats.totalExpenses);
          break;
        case 'income':
          newStats.totalIncome += value;
          break;
        case 'saved':
          newStats.totalSaved = value;
          await this.checkSavingsAchievements(value);
          break;
        case 'goalAchieved':
          newStats.goalsAchieved += 1;
          await this.checkGoalAchievements(newStats.goalsAchieved);
          break;
        case 'budgetUnder':
          newStats.budgetsUnderCount += 1;
          await this.checkBudgetAchievements(newStats.budgetsUnderCount);
          break;
      }

      await updateDoc(docRef, {
        stats: newStats,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async checkExpenseAchievements(count) {
    if (count >= 1) await this.unlockAchievement('first_expense');
    if (count >= 10) await this.unlockAchievement('expenses_10');
    if (count >= 50) await this.unlockAchievement('expenses_50');
    if (count >= 100) await this.unlockAchievement('expenses_100');
    if (count >= 500) await this.unlockAchievement('expenses_500');
  }

  async checkSavingsAchievements(amount) {
    if (amount >= 1000) await this.unlockAchievement('saved_1k');
    if (amount >= 10000) await this.unlockAchievement('saved_10k');
    if (amount >= 50000) await this.unlockAchievement('saved_50k');
    if (amount >= 100000) await this.unlockAchievement('saved_1l');
  }

  async checkGoalAchievements(count) {
    if (count >= 1) await this.unlockAchievement('goal_achieved');
    if (count >= 3) await this.unlockAchievement('goals_3');
  }

  async checkBudgetAchievements(count) {
    if (count >= 1) await this.unlockAchievement('budget_under');
    if (count >= 3) await this.unlockAchievement('budget_3months');
  }

  // Get all achievements with unlock status
  async getAllAchievements() {
    const data = await this.getUserGamification();
    const unlockedIds = data?.achievements || [];

    return Object.values(this.achievements).map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
      unlockedAt: null // Could store timestamps if needed
    }));
  }

  // Get achievements by category
  async getAchievementsByCategory() {
    const achievements = await this.getAllAchievements();
    const categories = {};

    achievements.forEach(achievement => {
      if (!categories[achievement.category]) {
        categories[achievement.category] = [];
      }
      categories[achievement.category].push(achievement);
    });

    return categories;
  }
}

const gamificationService = new GamificationService();
export default gamificationService;
