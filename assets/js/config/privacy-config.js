// Privacy Configuration
// Controls which fields are encrypted and which remain in plaintext

export const privacyConfig = {
  // Master switch for encryption
  encryptionEnabled: true,
  
  // Encryption version (for future migrations)
  encryptionVersion: 1,
  
  // Fields that should NEVER be encrypted (needed for queries/filtering)
  // These are metadata fields that don't contain sensitive user data
  unencryptedFields: [
    'id',
    'userId',
    'createdBy',
    'invitedBy',
    'invitedEmail',
    'createdAt',
    'updatedAt',
    'date',
    'category',
    'type',
    'status',
    'month',
    'year',
    'linkedType',
    'linkedId',
    'familyGroupId',
    'tripGroupId',
    'tripGroupExpenseId',
    'groupId',
    'splitType',
    'frequency',
    'isActive',
    'isRecurring',
    'tags',
    '_encrypted',
    '_encryptionVersion'
  ],
  
  // Collections that should be encrypted
  // User collection is NOT encrypted - it stores profile info for tracking
  // Family/shared collections are NOT encrypted - they use shared data across users
  encryptedCollections: [
    'expenses',
    'income',
    'budgets',
    'investments',
    'investmentPriceHistory',
    'goals',
    'loans',
    'houses',
    'vehicles',
    'notes',
    'documents',
    'recurringTransactions',
    'houseHelps',
    'houseHelpPayments',
    'fuelLogs',
    'splits',
    'categories',
    'wallets',
    'paymentMethods',
    'tripGroupExpenses',
    'tripGroupSettlements',
    'tripGroupMembers',      // Member info (name, email, phone)
    'transfers',             // Money transfers between accounts
    'netWorthSnapshots'      // Net worth history snapshots
    // NOTE: familyGroups and familyInvitations are NOT encrypted because:
    // - They are shared across multiple users
    // - Each user has a different encryption key (derived from their userId)
    // - Encrypting shared data with one user's key makes it unreadable by others
  ],
  
  // Collections that should NOT be encrypted
  // These contain non-sensitive data or are needed for app functionality
  unencryptedCollections: [
    'users',              // User profile - needed for tracking location/name
    'userPreferences',    // App preferences
    'tripGroups',         // Trip group metadata
    'familyGroups',       // Family groups - shared across users, cannot use per-user encryption
    'familyInvitations'   // Family invitations - shared data, must be readable by invitee
  ],
  
  // Sensitive fields that MUST be encrypted in each collection
  sensitiveFields: {
    expenses: ['amount', 'description', 'paymentMethod', 'notes', 'merchant', 'location'],
    income: ['amount', 'description', 'source', 'paymentMethod', 'notes'],
    budgets: ['amount', 'notes', 'spent'],
    investments: ['name', 'quantity', 'purchasePrice', 'currentPrice', 'notes', 'symbol', 'broker', 'accountNumber'],
    investmentPriceHistory: ['price', 'quantity', 'totalValue', 'notes'],
    goals: ['name', 'targetAmount', 'currentAmount', 'description', 'notes'],
    loans: ['name', 'lender', 'accountNumber', 'principalAmount', 'emiAmount', 'outstandingAmount', 'interestRate', 'notes'],
    houses: ['name', 'address', 'purchasePrice', 'currentValue', 'notes', 'rentAmount'],
    vehicles: ['name', 'registrationNumber', 'purchasePrice', 'currentValue', 'notes', 'insuranceDetails'],
    notes: ['title', 'content'],
    documents: ['name', 'description', 'fileUrl', 'fileName'],
    recurringTransactions: ['amount', 'description', 'paymentMethod', 'notes'],
    houseHelps: ['name', 'phone', 'monthlySalary', 'notes', 'address'],
    houseHelpPayments: ['amount', 'notes'],
    fuelLogs: ['fuelPrice', 'totalCost', 'fuelStation', 'notes', 'odometer', 'quantity'],
    splits: ['amount', 'description', 'notes', 'participants', 'paidBy', 'paidByName'],
    categories: ['name', 'description'],
    wallets: ['name', 'balance', 'notes'],
    paymentMethods: [
      'name',
      'cardNumber',
      'cardLast4',
      'cardHolderName',
      'expiryMonth',
      'expiryYear',
      'cvv',
      'bankName',
      'bankAccountNumber',
      'bankAccountHolderName',
      'ifscCode',
      'branchName',
      'upiId',
      'walletId',
      'notes'
    ],
    tripGroupExpenses: ['amount', 'description', 'notes', 'splits'],
    tripGroupSettlements: ['amount', 'notes'],
    tripGroupMembers: ['name', 'email', 'phone']  // Member personal information
    // NOTE: familyGroups and familyInvitations are NOT in sensitiveFields
    // because they are shared across users and cannot use per-user encryption
  }
};

export default privacyConfig;
