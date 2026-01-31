// Flat Groups Service - Extends Trip Groups Service for flatmate expense tracking
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import userService from './user-service.js';
import encryptionService from './encryption-service.js';

// Default flat expense categories
const DEFAULT_FLAT_CATEGORIES = [
  'Rent',
  'Electricity',
  'Water',
  'Internet',
  'Gas',
  'Groceries',
  'Cleaning',
  'Maintenance',
  'Other'
];

class FlatGroupsService {
  constructor() {
    this.groupsCollection = 'flatGroups';
    this.membersCollection = 'flatGroupMembers';
    this.expensesCollection = 'flatGroupExpenses';
    this.settlementsCollection = 'flatGroupSettlements';
  }

  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  getUser() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user;
  }

  getDefaultCategories() {
    return [...DEFAULT_FLAT_CATEGORIES];
  }

  // Create a new flat group
  async createGroup(groupData) {
    try {
      const userId = this.getUserId();
      const user = this.getUser();

      if (!groupData.name || groupData.name.trim() === '') {
        return { success: false, error: 'Group name is required' };
      }

      const now = Timestamp.now();

      const flatGroup = {
        name: groupData.name.trim(),
        description: groupData.description || '',
        address: groupData.address || '',
        monthlyRent: groupData.monthlyRent || 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        categories: groupData.categories || [...DEFAULT_FLAT_CATEGORIES],
        memberCount: 1,
        totalExpenses: 0
      };

      const groupRef = await addDoc(collection(db, this.groupsCollection), flatGroup);
      const groupId = groupRef.id;

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

      return { success: true, groupId: groupId, data: { id: groupId, ...flatGroup } };
    } catch (error) {
      console.error('Error creating flat group:', error);
      return { success: false, error: error.message };
    }
  }

  // Get a specific flat group
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
      console.error('Error getting flat group:', error);
      return { success: false, error: error.message };
    }
  }

  // Update a flat group
  async updateGroup(groupId, updates) {
    try {
      const userId = this.getUserId();

      const isTotalExpensesOnly = Object.keys(updates).length === 1 && 'totalExpenses' in updates;
      
      if (!isTotalExpensesOnly) {
        const isAdmin = await this.isGroupAdmin(groupId, userId);
        if (!isAdmin) {
          return { success: false, error: 'Only admins can update group details' };
        }
      }

      const groupRef = doc(db, this.groupsCollection, groupId);
      
      const updateData = {
        updatedAt: Timestamp.now()
      };

      if (updates.name) updateData.name = updates.name.trim();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.monthlyRent !== undefined) updateData.monthlyRent = updates.monthlyRent;
      if (updates.categories) updateData.categories = updates.categories;
      if (updates.totalExpenses !== undefined) updateData.totalExpenses = updates.totalExpenses;

      await updateDoc(groupRef, updateData);

      return { success: true };
    } catch (error) {
      console.error('Error updating flat group:', error);
      return { success: false, error: error.message };
    }
  }

  // Archive a flat group
  async archiveGroup(groupId) {
    try {
      const userId = this.getUserId();

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
      console.error('Error archiving flat group:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all flat groups for current user
  async getUserGroups(status = null) {
    try {
      const userId = this.getUserId();

      let groupIds = [];
      
      try {
        const membersQuery = query(
          collection(db, this.membersCollection),
          where('userId', '==', userId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        membersSnapshot.forEach((doc) => {
          groupIds.push(doc.data().groupId);
        });
      } catch (queryError) {
        console.warn('Query with where clause failed, reading all members:', queryError);
        const allMembersSnapshot = await getDocs(collection(db, this.membersCollection));
        allMembersSnapshot.forEach((doc) => {
          if (doc.data().userId === userId) {
            groupIds.push(doc.data().groupId);
          }
        });
      }

      if (groupIds.length === 0) {
        return [];
      }

      const groups = [];
      for (const groupId of groupIds) {
        const groupResult = await this.getGroup(groupId);
        if (groupResult.success) {
          if (!status || groupResult.data.status === status) {
            groups.push(groupResult.data);
          }
        }
      }

      groups.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  // Add a member to a flat group
  async addMember(groupId, memberData) {
    try {
      const userId = this.getUserId();

      let isAdmin = false;
      try {
        isAdmin = await this.isGroupAdmin(groupId, userId);
      } catch (error) {
        console.warn('Could not verify admin status, checking group creator:', error);
        const groupResult = await this.getGroup(groupId);
        if (groupResult.success && groupResult.data.createdBy === userId) {
          isAdmin = true;
        }
      }
      
      if (!isAdmin) {
        return { success: false, error: 'Only admins can add members' };
      }

      const groupResult = await this.getGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }
      if (groupResult.data.status === 'archived') {
        return { success: false, error: 'Cannot add members to archived groups' };
      }

      const currentMemberCount = groupResult.data.memberCount || 0;

      if (!memberData.name || memberData.name.trim() === '') {
        return { success: false, error: 'Member name is required' };
      }

      const now = Timestamp.now();
      
      let isRupiyaUser = false;
      let existingUserId = null;

      if (memberData.email) {
        const existingUser = await userService.getUserByEmail(memberData.email);
        if (existingUser) {
          isRupiyaUser = true;
          existingUserId = existingUser.id;
          
          if (!memberData.userId) {
            memberData.userId = existingUserId;
          }
        }
      }

      const memberId = memberData.userId 
        ? `${groupId}_${memberData.userId}`
        : `${groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

      const memberToSave = {
        ...member,
        phone: member.phone ? await encryptionService.encryptValue(member.phone) : null
      };

      await setDoc(doc(db, this.membersCollection, memberId), memberToSave);

      const groupRef = doc(db, this.groupsCollection, groupId);
      const newMemberCount = currentMemberCount + 1;
      
      try {
        await updateDoc(groupRef, {
          memberCount: newMemberCount,
          updatedAt: now
        });
      } catch (updateError) {
        console.error('Error updating memberCount:', updateError);
        try {
          await setDoc(groupRef, {
            memberCount: newMemberCount,
            updatedAt: now
          }, { merge: true });
        } catch (setError) {
          console.error('Error updating memberCount with setDoc:', setError);
        }
      }

      return { success: true, memberId: memberId, data: member };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all members of a flat group
  async getGroupMembers(groupId, retries = 3) {
    try {
      const membersQuery = query(
        collection(db, this.membersCollection),
        where('groupId', '==', groupId)
      );
      const snapshot = await getDocs(membersQuery);

      const members = [];
      
      for (const docSnap of snapshot.docs) {
        const memberData = { id: docSnap.id, ...docSnap.data() };
        
        try {
          if (memberData.phone && typeof memberData.phone === 'string') {
            try {
              const decrypted = await encryptionService.decryptValue(memberData.phone);
              memberData.phone = decrypted;
            } catch (e) {
              // Phone is not encrypted or can't be decrypted
            }
          }
        } catch (decryptError) {
          console.warn('Error decrypting member data:', decryptError);
        }
        
        members.push(memberData);
      }

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
      
      if (memberSnap.exists()) {
        return true;
      }

      const user = authService.getCurrentUser();
      if (user && user.email) {
        const hasPendingInvite = await this.checkAndAcceptPendingInvitation(groupId, user.email, userId);
        if (hasPendingInvite) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking member status:', error);
      return false;
    }
  }

  // Check and accept pending invitation
  async checkAndAcceptPendingInvitation(groupId, userEmail, userId) {
    try {
      if (!userEmail || !userId) {
        return false;
      }
      
      const membersQuery = query(
        collection(db, this.membersCollection),
        where('groupId', '==', groupId)
      );
      const snapshot = await getDocs(membersQuery);
      
      for (const docSnap of snapshot.docs) {
        const memberData = docSnap.data();
        
        if (memberData.userId) {
          continue;
        }
        
        const memberEmail = memberData.email;
        
        if (memberEmail && 
            memberEmail.toLowerCase() === userEmail.toLowerCase()) {
                    
          const oldMemberId = docSnap.id;
          const newMemberId = `${groupId}_${userId}`;
          
          const existingMemberRef = doc(db, this.membersCollection, newMemberId);
          const existingMemberSnap = await getDoc(existingMemberRef);
          
          if (existingMemberSnap.exists()) {
            await deleteDoc(doc(db, this.membersCollection, oldMemberId));
            return true;
          }
          
          const updatedMemberData = {
            ...memberData,
            id: newMemberId,
            userId: userId,
            inviteStatus: 'accepted',
            acceptedAt: Timestamp.now()
          };
          
          await setDoc(doc(db, this.membersCollection, newMemberId), updatedMemberData);
          await deleteDoc(doc(db, this.membersCollection, oldMemberId));
          return true;
        }
      }
    
      return false;
    } catch (error) {
      console.error('Error checking pending invitation:', error);
      return false;
    }
  }

  // Add an expense to a flat group
  async addGroupExpense(groupId, expenseData) {
    try {
      const userId = this.getUserId();

      const isMember = await this.isGroupMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Only group members can add expenses' };
      }

      const groupResult = await this.getGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }
      if (groupResult.data.status === 'archived') {
        return { success: false, error: 'Cannot add expenses to archived groups' };
      }

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
        addedBy: userId,
        createdAt: now
      };

      const expenseRef = await addDoc(collection(db, this.expensesCollection), expense);
      const expenseId = expenseRef.id;

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

  // Get all expenses for a flat group
  async getGroupExpenses(groupId, filters = {}) {
    try {
      let expensesQuery = query(
        collection(db, this.expensesCollection),
        where('groupId', '==', groupId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(expensesQuery);
      let expenses = [];

      for (const docSnap of snapshot.docs) {
        const data = { id: docSnap.id, ...docSnap.data() };
        expenses.push(data);
      }

      if (filters.category) {
        expenses = expenses.filter(e => e.category === filters.category);
      }
      if (filters.memberId) {
        expenses = expenses.filter(e => 
          e.paidBy === filters.memberId || 
          (e.splits && e.splits.some(s => s.memberId === filters.memberId))
        );
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        expenses = expenses.filter(e => {
          if (!e.date) return false;
          try {
            const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
            return !isNaN(expenseDate.getTime()) && expenseDate >= start;
          } catch (error) {
            return false;
          }
        });
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        expenses = expenses.filter(e => {
          if (!e.date) return false;
          try {
            const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
            return !isNaN(expenseDate.getTime()) && expenseDate <= end;
          } catch (error) {
            return false;
          }
        });
      }

      return expenses;
    } catch (error) {
      console.error('Error getting group expenses:', error);
      return [];
    }
  }

  // Calculate balances for all members
  async calculateBalances(groupId) {
    try {
      const members = await this.getGroupMembers(groupId);
      const expenses = await this.getGroupExpenses(groupId);
      const settlements = await this.getSettlements(groupId);

      const balances = {};
      members.forEach(m => balances[m.id] = 0);

      // Add expenses
      expenses.forEach(expense => {
        // Person who paid gets positive balance
        if (balances[expense.paidBy] !== undefined) {
          balances[expense.paidBy] += expense.amount;
        }

        // People who owe get negative balance
        expense.splits.forEach(split => {
          if (balances[split.memberId] !== undefined) {
            balances[split.memberId] -= split.amount;
          }
        });
      });

      // Subtract settlements
      settlements.forEach(settlement => {
        if (balances[settlement.fromMemberId] !== undefined) {
          balances[settlement.fromMemberId] += settlement.amount;
        }
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

  // Get settlements
  async getSettlements(groupId) {
    try {
      const settlementsQuery = query(
        collection(db, this.settlementsCollection),
        where('groupId', '==', groupId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(settlementsQuery);

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting settlements:', error);
      return [];
    }
  }

  // Add a settlement
  async addSettlement(groupId, settlementData) {
    try {
      const userId = this.getUserId();

      const isMember = await this.isGroupMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Only group members can add settlements' };
      }

      if (!settlementData.fromMemberId || !settlementData.toMemberId) {
        return { success: false, error: 'Both members are required' };
      }
      if (settlementData.fromMemberId === settlementData.toMemberId) {
        return { success: false, error: 'Cannot settle with yourself' };
      }
      if (!settlementData.amount || settlementData.amount <= 0) {
        return { success: false, error: 'Amount must be greater than zero' };
      }

      const now = Timestamp.now();

      const settlement = {
        groupId: groupId,
        fromMemberId: settlementData.fromMemberId,
        toMemberId: settlementData.toMemberId,
        amount: settlementData.amount,
        notes: settlementData.notes || '',
        date: now,
        addedBy: userId,
        createdAt: now
      };

      const settlementRef = await addDoc(collection(db, this.settlementsCollection), settlement);

      return { success: true, settlementId: settlementRef.id, data: { id: settlementRef.id, ...settlement } };
    } catch (error) {
      console.error('Error adding settlement:', error);
      return { success: false, error: error.message };
    }
  }

  // Simplify debts
  async simplifyDebts(groupId) {
    try {
      const balances = await this.calculateBalances(groupId);
      const members = await this.getGroupMembers(groupId);

      const memberLookup = {};
      members.forEach(m => memberLookup[m.id] = m);

      const creditors = [];
      const debtors = [];

      Object.entries(balances).forEach(([memberId, balance]) => {
        if (balance > 0.01) {
          creditors.push({ memberId, amount: balance, name: memberLookup[memberId]?.name });
        } else if (balance < -0.01) {
          debtors.push({ memberId, amount: Math.abs(balance), name: memberLookup[memberId]?.name });
        }
      });

      const transactions = [];

      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      let i = 0, j = 0;
      while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const amount = Math.min(creditor.amount, debtor.amount);

        transactions.push({
          fromMemberId: debtor.memberId,
          fromName: debtor.name,
          toMemberId: creditor.memberId,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100
        });

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
      }

      return transactions;
    } catch (error) {
      console.error('Error simplifying debts:', error);
      return [];
    }
  }

  // Get member balance
  async getMemberBalance(groupId, memberId) {
    const balances = await this.calculateBalances(groupId);
    return balances[memberId] || 0;
  }
}

export default new FlatGroupsService();
