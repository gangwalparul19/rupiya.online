// Trip Groups Service
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

// Default trip categories
const DEFAULT_TRIP_CATEGORIES = [
  'Accommodation',
  'Transport',
  'Food & Dining',
  'Activities',
  'Shopping',
  'Tips',
  'Other'
];

class TripGroupsService {
  constructor() {
    this.groupsCollection = 'tripGroups';
    this.membersCollection = 'tripGroupMembers';
    this.expensesCollection = 'tripGroupExpenses';
    this.settlementsCollection = 'tripGroupSettlements';
    this.personalExpensesCollection = 'expenses';
  }

  // Get current user ID
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Get current user
  getUser() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user;
  }

  // ============================================
  // GROUP CRUD OPERATIONS
  // ============================================

  // Create a new trip group
  async createGroup(groupData) {
    try {
      const userId = this.getUserId();
      const user = this.getUser();

      // Validate required fields
      if (!groupData.name || groupData.name.trim() === '') {
        return { success: false, error: 'Group name is required' };
      }

      const now = Timestamp.now();

      const tripGroup = {
        name: groupData.name.trim(),
        description: groupData.description || '',
        destination: groupData.destination || '',
        startDate: groupData.startDate ? Timestamp.fromDate(new Date(groupData.startDate)) : null,
        endDate: groupData.endDate ? Timestamp.fromDate(new Date(groupData.endDate)) : null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        budget: {
          total: groupData.budget?.total || 0,
          categories: groupData.budget?.categories || {}
        },
        categories: groupData.categories || [...DEFAULT_TRIP_CATEGORIES],
        memberCount: 1,
        totalExpenses: 0
      };

      // Create the group document
      const groupRef = await addDoc(collection(db, this.groupsCollection), tripGroup);
      const groupId = groupRef.id;

      // Add a small delay to ensure the group document is readable
      // This handles Firestore's eventual consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add creator as admin member
      const memberId = `${groupId}_${userId}`;
      const memberData = {
        id: memberId,
        groupId: groupId,
        userId: userId,
        name: user.displayName || user.email,
        email: user.email,
        phone: null,
        isAdmin: true,
        isRupiyaUser: true,
        notificationsEnabled: true,
        joinedAt: now,
        inviteStatus: 'accepted'
      };

      await setDoc(doc(db, this.membersCollection, memberId), memberData);

      return { success: true, groupId: groupId, data: { id: groupId, ...tripGroup } };
    } catch (error) {
      console.error('Error creating trip group:', error);
      return { success: false, error: error.message };
    }
  }

  // Get a specific trip group
  async getGroup(groupId) {
    try {
      const docRef = doc(db, this.groupsCollection, groupId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Group not found' };
      }
    } catch (error) {
      console.error('Error getting trip group:', error);
      return { success: false, error: error.message };
    }
  }

  // Update a trip group
  async updateGroup(groupId, updates) {
    try {
      const userId = this.getUserId();

      // Check if user is admin
      const isAdmin = await this.isGroupAdmin(groupId, userId);
      if (!isAdmin) {
        return { success: false, error: 'Only admins can update group details' };
      }

      const groupRef = doc(db, this.groupsCollection, groupId);
      
      // Prepare update data
      const updateData = {
        updatedAt: Timestamp.now()
      };

      if (updates.name) updateData.name = updates.name.trim();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.startDate) updateData.startDate = Timestamp.fromDate(new Date(updates.startDate));
      if (updates.endDate) updateData.endDate = Timestamp.fromDate(new Date(updates.endDate));
      if (updates.budget) updateData.budget = updates.budget;
      if (updates.categories) updateData.categories = updates.categories;

      await updateDoc(groupRef, updateData);

      return { success: true };
    } catch (error) {
      console.error('Error updating trip group:', error);
      return { success: false, error: error.message };
    }
  }

  // Archive a trip group
  async archiveGroup(groupId) {
    try {
      const userId = this.getUserId();

      // Check if user is admin
      const isAdmin = await this.isGroupAdmin(groupId, userId);
      if (!isAdmin) {
        return { success: false, error: 'Only admins can archive groups' };
      }

      const groupRef = doc(db, this.groupsCollection, groupId);
      await updateDoc(groupRef, {
        status: 'archived',
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error archiving trip group:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all trip groups for current user
  async getUserGroups(status = null) {
    try {
      const userId = this.getUserId();

      // Get all member records for this user
      const membersQuery = query(
        collection(db, this.membersCollection),
        where('userId', '==', userId)
      );
      const membersSnapshot = await getDocs(membersQuery);

      const groupIds = [];
      membersSnapshot.forEach((doc) => {
        groupIds.push(doc.data().groupId);
      });

      if (groupIds.length === 0) {
        return [];
      }

      // Get all groups
      const groups = [];
      for (const groupId of groupIds) {
        const groupResult = await this.getGroup(groupId);
        if (groupResult.success) {
          // Filter by status if specified
          if (!status || groupResult.data.status === status) {
            groups.push(groupResult.data);
          }
        }
      }

      // Sort by createdAt descending
      groups.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }


  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  // Add a member to a trip group
  async addMember(groupId, memberData) {
    try {
      const userId = this.getUserId();

      // Check if user is admin
      const isAdmin = await this.isGroupAdmin(groupId, userId);
      if (!isAdmin) {
        return { success: false, error: 'Only admins can add members' };
      }

      // Check if group exists and is active
      const groupResult = await this.getGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }
      if (groupResult.data.status === 'archived') {
        return { success: false, error: 'Cannot add members to archived groups' };
      }

      // Validate member data
      if (!memberData.name || memberData.name.trim() === '') {
        return { success: false, error: 'Member name is required' };
      }

      const now = Timestamp.now();
      
      // Check if this is a Rupiya user (by email)
      let isRupiyaUser = false;
      let existingUserId = null;

      if (memberData.email) {
        // TODO: Check if email exists in users collection
        // For now, we'll mark as non-Rupiya user
        isRupiyaUser = false;
      }

      // Generate member ID
      const memberId = memberData.userId 
        ? `${groupId}_${memberData.userId}`
        : `${groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if member already exists
      const existingMember = await getDoc(doc(db, this.membersCollection, memberId));
      if (existingMember.exists()) {
        return { success: false, error: 'Member already exists in this group' };
      }

      const member = {
        id: memberId,
        groupId: groupId,
        userId: memberData.userId || null,
        name: memberData.name.trim(),
        email: memberData.email ? memberData.email.toLowerCase() : null,
        phone: memberData.phone || null,
        isAdmin: memberData.isAdmin || false,
        isRupiyaUser: isRupiyaUser,
        notificationsEnabled: memberData.notificationsEnabled !== false,
        joinedAt: now,
        inviteStatus: memberData.userId ? 'pending' : 'accepted'
      };

      await setDoc(doc(db, this.membersCollection, memberId), member);

      // Update group member count
      const groupRef = doc(db, this.groupsCollection, groupId);
      await updateDoc(groupRef, {
        memberCount: groupResult.data.memberCount + 1,
        updatedAt: now
      });

      return { success: true, memberId: memberId, data: member };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove a member from a trip group
  async removeMember(groupId, memberId) {
    try {
      const userId = this.getUserId();

      // Check if user is admin
      const isAdmin = await this.isGroupAdmin(groupId, userId);
      if (!isAdmin) {
        return { success: false, error: 'Only admins can remove members' };
      }

      // Get member data
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberSnap = await getDoc(memberRef);

      if (!memberSnap.exists()) {
        return { success: false, error: 'Member not found' };
      }

      const memberData = memberSnap.data();

      // Check if member has non-zero balance
      const balance = await this.getMemberBalance(groupId, memberId);
      if (Math.abs(balance) > 0.01) {
        return { success: false, error: 'Member must settle balance before leaving' };
      }

      // Cannot remove the only admin
      if (memberData.isAdmin) {
        const members = await this.getGroupMembers(groupId);
        const adminCount = members.filter(m => m.isAdmin).length;
        if (adminCount === 1) {
          return { success: false, error: 'Cannot remove the only admin' };
        }
      }

      // Delete member
      await deleteDoc(memberRef);

      // Update group member count
      const groupResult = await this.getGroup(groupId);
      if (groupResult.success) {
        const groupRef = doc(db, this.groupsCollection, groupId);
        await updateDoc(groupRef, {
          memberCount: Math.max(0, groupResult.data.memberCount - 1),
          updatedAt: Timestamp.now()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all members of a trip group
  async getGroupMembers(groupId, retries = 3) {
    try {
      const membersQuery = query(
        collection(db, this.membersCollection),
        where('groupId', '==', groupId)
      );
      const snapshot = await getDocs(membersQuery);

      const members = [];
      snapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() });
      });

      // If no members found and we have retries left, wait and retry
      // This handles the case where a group was just created
      if (members.length === 0 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.getGroupMembers(groupId, retries - 1);
      }

      return members;
    } catch (error) {
      console.error('Error getting group members:', error);
      return [];
    }
  }

  // Check if user is admin of a group
  async isGroupAdmin(groupId, userId) {
    try {
      const memberId = `${groupId}_${userId}`;
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        return memberSnap.data().isAdmin === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Check if user is member of a group
  async isGroupMember(groupId, userId) {
    try {
      const memberId = `${groupId}_${userId}`;
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberSnap = await getDoc(memberRef);
      return memberSnap.exists();
    } catch (error) {
      console.error('Error checking member status:', error);
      return false;
    }
  }

  // Get member by ID
  async getMember(memberId) {
    try {
      const memberRef = doc(db, this.membersCollection, memberId);
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        return { success: true, data: { id: memberSnap.id, ...memberSnap.data() } };
      }
      return { success: false, error: 'Member not found' };
    } catch (error) {
      console.error('Error getting member:', error);
      return { success: false, error: error.message };
    }
  }


  // ============================================
  // EXPENSE MANAGEMENT
  // ============================================

  // Add an expense to a trip group
  async addGroupExpense(groupId, expenseData) {
    try {
      const userId = this.getUserId();

      // Check if user is member
      const isMember = await this.isGroupMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Only group members can add expenses' };
      }

      // Check if group is active
      const groupResult = await this.getGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }
      if (groupResult.data.status === 'archived') {
        return { success: false, error: 'Cannot add expenses to archived groups' };
      }

      // Validate expense data
      if (!expenseData.amount || expenseData.amount <= 0) {
        return { success: false, error: 'Amount must be greater than zero' };
      }
      if (!expenseData.description || expenseData.description.trim() === '') {
        return { success: false, error: 'Description is required' };
      }
      if (!expenseData.paidBy) {
        return { success: false, error: 'Paid by member is required' };
      }
      if (!expenseData.splits || expenseData.splits.length === 0) {
        return { success: false, error: 'At least one split participant is required' };
      }

      // Validate splits sum to total
      const splitSum = expenseData.splits.reduce((sum, s) => sum + (s.amount || 0), 0);
      if (Math.abs(splitSum - expenseData.amount) > 0.01) {
        return { success: false, error: 'Split amounts must equal total expense' };
      }

      const now = Timestamp.now();

      const expense = {
        groupId: groupId,
        description: expenseData.description.trim(),
        amount: expenseData.amount,
        category: expenseData.category || 'Other',
        date: expenseData.date ? Timestamp.fromDate(new Date(expenseData.date)) : now,
        paidBy: expenseData.paidBy,
        splitType: expenseData.splitType || 'equal',
        splits: expenseData.splits,
        linkedExpenseId: null,
        addedBy: userId,
        createdAt: now
      };

      // Create group expense
      const expenseRef = await addDoc(collection(db, this.expensesCollection), expense);
      const expenseId = expenseRef.id;

      // Create linked personal expense if current user paid
      const paidByMember = await this.getMember(expenseData.paidBy);
      if (paidByMember.success && paidByMember.data.userId === userId) {
        const personalExpense = {
          userId: userId,
          amount: expenseData.amount,
          description: `[Trip: ${groupResult.data.name}] ${expenseData.description.trim()}`,
          category: expenseData.category || 'Other',
          date: expenseData.date ? Timestamp.fromDate(new Date(expenseData.date)) : now,
          paymentMethod: 'Cash',
          tripGroupId: groupId,
          tripGroupExpenseId: expenseId,
          createdAt: now,
          updatedAt: now
        };

        const personalExpenseRef = await addDoc(collection(db, this.personalExpensesCollection), personalExpense);
        
        // Update group expense with linked expense ID
        await updateDoc(doc(db, this.expensesCollection, expenseId), {
          linkedExpenseId: personalExpenseRef.id
        });

        expense.linkedExpenseId = personalExpenseRef.id;
      }

      // Update group total expenses
      const groupRef = doc(db, this.groupsCollection, groupId);
      await updateDoc(groupRef, {
        totalExpenses: groupResult.data.totalExpenses + expenseData.amount,
        updatedAt: now
      });

      return { success: true, expenseId: expenseId, data: { id: expenseId, ...expense } };
    } catch (error) {
      console.error('Error adding group expense:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all expenses for a trip group
  async getGroupExpenses(groupId, filters = {}) {
    try {
      let expensesQuery = query(
        collection(db, this.expensesCollection),
        where('groupId', '==', groupId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(expensesQuery);
      let expenses = [];

      snapshot.forEach((doc) => {
        expenses.push({ id: doc.id, ...doc.data() });
      });

      // Apply filters
      if (filters.category) {
        expenses = expenses.filter(e => e.category === filters.category);
      }
      if (filters.memberId) {
        expenses = expenses.filter(e => 
          e.paidBy === filters.memberId || 
          e.splits.some(s => s.memberId === filters.memberId)
        );
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        expenses = expenses.filter(e => e.date.toDate() >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        expenses = expenses.filter(e => e.date.toDate() <= end);
      }

      return expenses;
    } catch (error) {
      console.error('Error getting group expenses:', error);
      return [];
    }
  }

  // Delete a group expense
  async deleteGroupExpense(groupId, expenseId) {
    try {
      const userId = this.getUserId();

      // Get expense
      const expenseRef = doc(db, this.expensesCollection, expenseId);
      const expenseSnap = await getDoc(expenseRef);

      if (!expenseSnap.exists()) {
        return { success: false, error: 'Expense not found' };
      }

      const expense = expenseSnap.data();

      // Check if user added the expense
      if (expense.addedBy !== userId) {
        return { success: false, error: 'Only the person who added the expense can delete it' };
      }

      // Delete linked personal expense if exists
      if (expense.linkedExpenseId) {
        try {
          await deleteDoc(doc(db, this.personalExpensesCollection, expense.linkedExpenseId));
        } catch (e) {
          console.warn('Could not delete linked personal expense:', e);
        }
      }

      // Delete group expense
      await deleteDoc(expenseRef);

      // Update group total expenses
      const groupResult = await this.getGroup(groupId);
      if (groupResult.success) {
        const groupRef = doc(db, this.groupsCollection, groupId);
        await updateDoc(groupRef, {
          totalExpenses: Math.max(0, groupResult.data.totalExpenses - expense.amount),
          updatedAt: Timestamp.now()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting group expense:', error);
      return { success: false, error: error.message };
    }
  }


  // ============================================
  // SETTLEMENT MANAGEMENT
  // ============================================

  // Record a settlement between members
  async recordSettlement(groupId, settlementData) {
    try {
      const userId = this.getUserId();

      // Check if user is member
      const isMember = await this.isGroupMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Only group members can record settlements' };
      }

      // Validate settlement data
      if (!settlementData.amount || settlementData.amount <= 0) {
        return { success: false, error: 'Amount must be greater than zero' };
      }
      if (!settlementData.fromMemberId) {
        return { success: false, error: 'Payer is required' };
      }
      if (!settlementData.toMemberId) {
        return { success: false, error: 'Receiver is required' };
      }
      if (settlementData.fromMemberId === settlementData.toMemberId) {
        return { success: false, error: 'Payer and receiver cannot be the same' };
      }

      const now = Timestamp.now();

      const settlement = {
        groupId: groupId,
        fromMemberId: settlementData.fromMemberId,
        toMemberId: settlementData.toMemberId,
        amount: settlementData.amount,
        date: settlementData.date ? Timestamp.fromDate(new Date(settlementData.date)) : now,
        notes: settlementData.notes || '',
        recordedBy: userId,
        createdAt: now
      };

      const settlementRef = await addDoc(collection(db, this.settlementsCollection), settlement);

      return { success: true, settlementId: settlementRef.id, data: { id: settlementRef.id, ...settlement } };
    } catch (error) {
      console.error('Error recording settlement:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all settlements for a trip group
  async getSettlements(groupId) {
    try {
      const settlementsQuery = query(
        collection(db, this.settlementsCollection),
        where('groupId', '==', groupId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(settlementsQuery);
      const settlements = [];

      snapshot.forEach((doc) => {
        settlements.push({ id: doc.id, ...doc.data() });
      });

      return settlements;
    } catch (error) {
      console.error('Error getting settlements:', error);
      return [];
    }
  }

  // ============================================
  // BUDGET MANAGEMENT
  // ============================================

  // Set budget for a trip group
  async setBudget(groupId, budgetData) {
    try {
      const userId = this.getUserId();

      // Check if user is admin
      const isAdmin = await this.isGroupAdmin(groupId, userId);
      if (!isAdmin) {
        return { success: false, error: 'Only admins can set budget' };
      }

      const groupRef = doc(db, this.groupsCollection, groupId);
      await updateDoc(groupRef, {
        budget: {
          total: budgetData.total || 0,
          categories: budgetData.categories || {}
        },
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting budget:', error);
      return { success: false, error: error.message };
    }
  }

  // Get budget status for a trip group
  async getBudgetStatus(groupId) {
    try {
      const groupResult = await this.getGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }

      const group = groupResult.data;
      const expenses = await this.getGroupExpenses(groupId);

      // Calculate total spent
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Calculate spent by category
      const spentByCategory = {};
      expenses.forEach(e => {
        spentByCategory[e.category] = (spentByCategory[e.category] || 0) + e.amount;
      });

      // Calculate progress
      const budget = group.budget || { total: 0, categories: {} };
      const progress = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;
      const remaining = budget.total - totalSpent;

      // Check warnings
      const warnings = [];
      if (budget.total > 0) {
        if (progress >= 100) {
          warnings.push({
            type: 'overspend',
            message: `Budget exceeded by ₹${Math.abs(remaining).toFixed(2)}`,
            amount: Math.abs(remaining)
          });
        } else if (progress >= 80) {
          warnings.push({
            type: 'warning',
            message: `${progress.toFixed(0)}% of budget used`,
            amount: remaining
          });
        }
      }

      // Check category budgets
      Object.entries(budget.categories || {}).forEach(([category, categoryBudget]) => {
        const categorySpent = spentByCategory[category] || 0;
        const categoryProgress = categoryBudget > 0 ? (categorySpent / categoryBudget) * 100 : 0;
        
        if (categoryProgress >= 100) {
          warnings.push({
            type: 'category_overspend',
            category: category,
            message: `${category} budget exceeded`,
            amount: categorySpent - categoryBudget
          });
        } else if (categoryProgress >= 80) {
          warnings.push({
            type: 'category_warning',
            category: category,
            message: `${category}: ${categoryProgress.toFixed(0)}% used`,
            amount: categoryBudget - categorySpent
          });
        }
      });

      return {
        success: true,
        data: {
          budget: budget.total,
          spent: totalSpent,
          remaining: remaining,
          progress: progress,
          spentByCategory: spentByCategory,
          categoryBudgets: budget.categories,
          warnings: warnings
        }
      };
    } catch (error) {
      console.error('Error getting budget status:', error);
      return { success: false, error: error.message };
    }
  }


  // ============================================
  // BALANCE CALCULATIONS
  // ============================================

  // Calculate balances for all members in a group
  async calculateBalances(groupId) {
    try {
      const members = await this.getGroupMembers(groupId);
      const expenses = await this.getGroupExpenses(groupId);
      const settlements = await this.getSettlements(groupId);

      // Initialize balances
      const balances = {};
      members.forEach(m => {
        balances[m.id] = 0;
      });

      // Process expenses
      expenses.forEach(expense => {
        // Person who paid gets credit for the full amount
        if (balances[expense.paidBy] !== undefined) {
          balances[expense.paidBy] += expense.amount;
        }

        // Each person in the split owes their share
        expense.splits.forEach(split => {
          if (balances[split.memberId] !== undefined) {
            balances[split.memberId] -= split.amount;
          }
        });
      });

      // Process settlements
      settlements.forEach(settlement => {
        // Person who paid (from) reduces their debt
        if (balances[settlement.fromMemberId] !== undefined) {
          balances[settlement.fromMemberId] += settlement.amount;
        }
        // Person who received (to) increases their debt
        if (balances[settlement.toMemberId] !== undefined) {
          balances[settlement.toMemberId] -= settlement.amount;
        }
      });

      return balances;
    } catch (error) {
      console.error('Error calculating balances:', error);
      return {};
    }
  }

  // Get balance for a specific member
  async getMemberBalance(groupId, memberId) {
    try {
      const balances = await this.calculateBalances(groupId);
      return balances[memberId] || 0;
    } catch (error) {
      console.error('Error getting member balance:', error);
      return 0;
    }
  }

  // Simplify debts to minimize transactions
  async simplifyDebts(groupId) {
    try {
      const balances = await this.calculateBalances(groupId);
      const members = await this.getGroupMembers(groupId);

      // Create member lookup
      const memberLookup = {};
      members.forEach(m => {
        memberLookup[m.id] = m;
      });

      // Separate creditors (positive balance) and debtors (negative balance)
      const creditors = [];
      const debtors = [];

      Object.entries(balances).forEach(([memberId, balance]) => {
        if (balance > 0.01) {
          creditors.push({ memberId, amount: balance, name: memberLookup[memberId]?.name || 'Unknown' });
        } else if (balance < -0.01) {
          debtors.push({ memberId, amount: -balance, name: memberLookup[memberId]?.name || 'Unknown' });
        }
      });

      // Sort by amount descending
      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      // Generate simplified transactions
      const transactions = [];
      let i = 0, j = 0;

      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amount = Math.min(debtor.amount, creditor.amount);

        if (amount > 0.01) {
          transactions.push({
            from: debtor.memberId,
            fromName: debtor.name,
            to: creditor.memberId,
            toName: creditor.name,
            amount: Math.round(amount * 100) / 100
          });
        }

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
      }

      return transactions;
    } catch (error) {
      console.error('Error simplifying debts:', error);
      return [];
    }
  }

  // Check if group is fully settled
  async isFullySettled(groupId) {
    try {
      const balances = await this.calculateBalances(groupId);
      return Object.values(balances).every(b => Math.abs(b) < 0.01);
    } catch (error) {
      console.error('Error checking if fully settled:', error);
      return false;
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  // Calculate equal split
  calculateEqualSplit(amount, memberIds) {
    const splitAmount = amount / memberIds.length;
    return memberIds.map(memberId => ({
      memberId,
      amount: Math.round(splitAmount * 100) / 100
    }));
  }

  // Calculate percentage split
  calculatePercentageSplit(amount, percentages) {
    return percentages.map(p => ({
      memberId: p.memberId,
      amount: Math.round((amount * p.percentage / 100) * 100) / 100,
      percentage: p.percentage
    }));
  }

  // Get default trip categories
  getDefaultCategories() {
    return [...DEFAULT_TRIP_CATEGORIES];
  }
}

// Create and export singleton instance
const tripGroupsService = new TripGroupsService();
export default tripGroupsService;
