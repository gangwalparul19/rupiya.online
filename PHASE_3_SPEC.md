# Phase 3: Expense & Income Management - Specification

## 📋 Overview

This specification defines the implementation of comprehensive expense and income management features for the Rupiya application. This phase builds upon the completed Phase 1 (Authentication) and Phase 2 (Dashboard) to provide full transaction management capabilities.

## 🎯 Goals

1. **Enable transaction tracking** - Users can add, edit, and delete expenses and income
2. **Provide filtering and search** - Users can find specific transactions quickly
3. **Support data export** - Users can export data to CSV for external analysis
4. **Ensure mobile responsiveness** - Full functionality on all devices
5. **Maintain data integrity** - Reliable Firestore integration with validation

## 📄 Specification Document

The complete requirements specification has been created at:
```
.kiro/specs/expense-income-management/requirements.md
```

## 🎨 Key Features

### Expense Management
- ✅ View all expenses in organized list
- ✅ Add new expenses with modal form
- ✅ Edit existing expenses
- ✅ Delete expenses with confirmation
- ✅ Filter by category, date range, payment method
- ✅ Search by description
- ✅ Export to CSV
- ✅ Pagination (20 per page)

### Income Management
- ✅ View all income entries in organized list
- ✅ Add new income with modal form
- ✅ Edit existing income
- ✅ Delete income with confirmation
- ✅ Filter by source and date range
- ✅ Search by description
- ✅ Export to CSV
- ✅ Pagination (20 per page)

### Shared Features
- ✅ Form validation with clear error messages
- ✅ Loading states for all operations
- ✅ Toast notifications for success/error
- ✅ Mobile responsive design
- ✅ Real-time Firestore integration
- ✅ Empty state handling

## 📊 Requirements Summary

### Total Requirements: 20

1. **Expense Page Display** - Show all expenses with sorting
2. **Add Expense** - Modal form with validation
3. **Edit Expense** - Pre-populated modal form
4. **Delete Expense** - Confirmation dialog
5. **Expense Filtering** - Category, date, payment method
6. **Expense Search** - Real-time description search
7. **Income Page Display** - Show all income with sorting
8. **Add Income** - Modal form with validation
9. **Edit Income** - Pre-populated modal form
10. **Delete Income** - Confirmation dialog
11. **Income Filtering** - Source and date range
12. **Income Search** - Real-time description search
13. **Export Functionality** - CSV export for both
14. **Pagination** - 20 items per page
15. **Form Validation** - Comprehensive validation
16. **Mobile Responsiveness** - Full mobile support
17. **Loading States** - Visual feedback
18. **Error Handling** - User-friendly messages
19. **Data Persistence** - Reliable Firestore saves
20. **Category Management** - Predefined categories

## 🏗️ Implementation Structure

### Files to Create

#### HTML Pages
```
rupiya-vanilla/
├── expenses.html          # Expense management page
└── income.html            # Income management page
```

#### CSS Files
```
rupiya-vanilla/assets/css/
├── expenses.css           # Expense page styles
└── income.css             # Income page styles
```

#### JavaScript Files
```
rupiya-vanilla/assets/js/pages/
├── expenses.js            # Expense page logic
└── income.js              # Income page logic
```

### Existing Files to Use
- `assets/js/services/firestore-service.js` - Already has CRUD methods
- `assets/js/components/toast.js` - Toast notifications
- `assets/js/utils/validation.js` - Form validation
- `assets/js/utils/helpers.js` - Utility functions
- `assets/css/common.css` - Global styles
- `assets/css/components.css` - Reusable components

## 🎨 Design Specifications

### Layout
- **Desktop:** Sidebar + main content area
- **Mobile:** Hamburger menu + full-width content
- **Cards:** White background, 2px blue border, hover effects
- **Modals:** Centered overlay with backdrop blur

### Color Scheme
- **Primary:** #4A90E2 (Blue)
- **Success:** #27AE60 (Green)
- **Danger:** #E74C3C (Red)
- **Warning:** #F39C12 (Orange)
- **Borders:** 2px solid blue on all cards

### Components
- **Transaction Cards:** Display amount, category, description, date
- **Action Buttons:** Edit (blue), Delete (red)
- **Filters:** Dropdown selects with blue focus states
- **Search:** Input with magnifying glass icon
- **Pagination:** Previous/Next buttons with page numbers

## 📱 Mobile Responsive Requirements

### Breakpoints
- **Desktop:** > 768px (2-column grid)
- **Mobile:** ≤ 768px (single column)

### Mobile Optimizations
- Single-column transaction list
- Full-screen modals
- Stacked filter controls
- Touch-friendly buttons (44px minimum)
- No horizontal scrolling
- Reduced padding and font sizes

## 🔧 Technical Requirements

### Firestore Integration
```javascript
// Expense document structure
{
  userId: string,
  amount: number,
  category: string,
  description: string,
  date: Timestamp,
  paymentMethod: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// Income document structure
{
  userId: string,
  amount: number,
  source: string,
  description: string,
  date: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Validation Rules
- **Amount:** Required, positive number, max 2 decimal places
- **Category/Source:** Required, non-empty string
- **Description:** Optional, max 200 characters
- **Date:** Required, not in future
- **Payment Method:** Required for expenses

### Categories & Sources

**Expense Categories:**
- Groceries
- Transportation
- Utilities
- Entertainment
- Healthcare
- Shopping
- Dining
- Education

**Income Sources:**
- Salary
- Freelance
- Investment
- Business
- Rental

**Payment Methods:**
- Cash
- Card
- UPI
- Bank Transfer
- Wallet

## 🧪 Testing Requirements

### Functional Testing
- [ ] Add expense with all fields
- [ ] Add expense with only required fields
- [ ] Edit expense and verify changes
- [ ] Delete expense and verify removal
- [ ] Filter expenses by category
- [ ] Filter expenses by date range
- [ ] Filter expenses by payment method
- [ ] Search expenses by description
- [ ] Export expenses to CSV
- [ ] Pagination works correctly
- [ ] Add income with all fields
- [ ] Edit income and verify changes
- [ ] Delete income and verify removal
- [ ] Filter income by source
- [ ] Search income by description
- [ ] Export income to CSV

### Validation Testing
- [ ] Amount validation (positive, numeric)
- [ ] Required field validation
- [ ] Date validation (not future)
- [ ] Error messages display correctly
- [ ] Form prevents submission with errors

### Mobile Testing
- [ ] All features work on mobile
- [ ] No horizontal scrolling
- [ ] Touch targets are adequate
- [ ] Modals display correctly
- [ ] Filters work on mobile

### Integration Testing
- [ ] Data saves to Firestore correctly
- [ ] Data loads from Firestore correctly
- [ ] User-specific data filtering works
- [ ] Real-time updates work
- [ ] Error handling works

## 📈 Success Criteria

1. ✅ Users can add, edit, and delete expenses
2. ✅ Users can add, edit, and delete income
3. ✅ Filtering and search work correctly
4. ✅ Export to CSV works
5. ✅ Pagination works with large datasets
6. ✅ Form validation prevents invalid data
7. ✅ Mobile responsive on all devices
8. ✅ No horizontal scrolling
9. ✅ Loading states provide feedback
10. ✅ Error messages are user-friendly
11. ✅ Data persists reliably to Firestore
12. ✅ No console errors

## 🚀 Implementation Approach

### Step 1: Create Expenses Page
1. Create `expenses.html` with layout
2. Create `expenses.css` with styles
3. Create `expenses.js` with logic
4. Implement add expense modal
5. Implement edit expense modal
6. Implement delete confirmation
7. Implement filters
8. Implement search
9. Implement pagination
10. Implement export

### Step 2: Create Income Page
1. Create `income.html` with layout
2. Create `income.css` with styles
3. Create `income.js` with logic
4. Implement add income modal
5. Implement edit income modal
6. Implement delete confirmation
7. Implement filters
8. Implement search
9. Implement pagination
10. Implement export

### Step 3: Testing & Polish
1. Test all functionality
2. Fix bugs
3. Optimize performance
4. Ensure mobile responsiveness
5. Add loading states
6. Improve error handling
7. Final QA

## 📝 Next Steps

1. **Review Requirements** - Read the complete spec at `.kiro/specs/expense-income-management/requirements.md`
2. **Approve Spec** - Confirm requirements are complete and accurate
3. **Begin Implementation** - Start with expenses page
4. **Iterative Development** - Build, test, refine
5. **User Testing** - Test with real data
6. **Deploy** - Move to production

## 🔗 Related Documents

- **Requirements:** `.kiro/specs/expense-income-management/requirements.md`
- **Migration Plan:** `MIGRATION_PLAN_NEXTJS_TO_VANILLA.md`
- **Phase 1 Complete:** `PHASE_1_COMPLETE.md`
- **Phase 2 Complete:** `PHASE_2_COMPLETE.md`
- **Test Credentials:** `TEST_CREDENTIALS.md`

## 💡 Notes

- This phase builds on existing authentication and dashboard
- Firestore service already has CRUD methods implemented
- Toast notification system is ready to use
- Form validation utilities are available
- Mobile responsive patterns established in Phase 2
- Blue theme and styling guidelines already defined

---

**Status:** ✅ Requirements Complete - Ready for Implementation
**Next Phase:** Phase 4 - Budgets & Goals
**Estimated Duration:** 1 week
