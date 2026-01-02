# Expenses Page - Testing Guide

## Quick Start

1. **Start Local Server**
   ```bash
   cd rupiya-vanilla
   python -m http.server 8000
   ```

2. **Open in Browser**
   ```
   http://localhost:8000/expenses.html
   ```

3. **Login Credentials**
   - Email: `test@rupiya.com`
   - Password: `Test@123456`

## Test Scenarios

### 1. Authentication Flow
- [ ] Navigate to expenses page without login → Should redirect to login
- [ ] Login and navigate to expenses page → Should load successfully
- [ ] User profile should show in sidebar (avatar, name, email)

### 2. Add Expense
- [ ] Click "Add Expense" button
- [ ] Modal should open with empty form
- [ ] Try submitting empty form → Should show validation errors
- [ ] Fill valid data:
  - Amount: 500
  - Category: Groceries
  - Description: Weekly groceries
  - Date: Today's date
  - Payment Method: Card
- [ ] Click "Save Expense" → Should show success toast
- [ ] Expense should appear in the list

### 3. Edit Expense
- [ ] Click edit icon on any expense card
- [ ] Modal should open with pre-filled data
- [ ] Modify amount to 600
- [ ] Click "Update Expense" → Should show success toast
- [ ] Expense should update in the list

### 4. Delete Expense
- [ ] Click delete icon on any expense card
- [ ] Confirmation modal should appear with expense details
- [ ] Click "Delete" → Should show success toast
- [ ] Expense should be removed from the list

### 5. Filtering
- [ ] Select "Groceries" from Category filter → Should show only groceries
- [ ] Select "Card" from Payment Method filter → Should show only card payments
- [ ] Select date range → Should show expenses within range
- [ ] Click "Clear Filters" → Should reset all filters

### 6. Search
- [ ] Type "groceries" in search box → Should filter by description
- [ ] Type partial text → Should show matching results
- [ ] Clear search → Should show all expenses

### 7. Pagination
- [ ] Add more than 20 expenses (use sample data generator on dashboard)
- [ ] Pagination controls should appear
- [ ] Click "Next" → Should show next page
- [ ] Click "Previous" → Should show previous page
- [ ] Page numbers should update correctly

### 8. Export
- [ ] Click "Export" button
- [ ] CSV file should download
- [ ] Open CSV → Should contain all filtered expenses
- [ ] Filename should include current date

### 9. Mobile Responsiveness
- [ ] Open in mobile view (or resize browser to < 768px)
- [ ] Hamburger menu should appear
- [ ] Click hamburger → Sidebar should slide in
- [ ] Filters should stack vertically
- [ ] Expense cards should be single column
- [ ] Modals should be full-screen
- [ ] No horizontal scrolling

### 10. Edge Cases
- [ ] Try adding expense with amount 0 → Should show error
- [ ] Try adding expense with negative amount → Should show error
- [ ] Try adding expense with future date → Should show error
- [ ] Try exporting with no expenses → Should show warning
- [ ] Try filtering with no results → Should show empty state

## Expected Behavior

### Loading States
- Initial page load shows spinner
- Save button shows spinner during save
- Delete button shows spinner during delete

### Toast Notifications
- Success: Green toast with checkmark
- Error: Red toast with X icon
- Warning: Yellow toast with warning icon

### Validation Errors
- Displayed inline below each field
- Red text color
- Clear when field is corrected

### Empty State
- Shows when no expenses exist
- Displays icon, message, and "Add Your First Expense" button

### Results Count
- Shows "X of Y expenses"
- Updates dynamically with filters

## Common Issues & Solutions

### Issue: Page redirects to login immediately
**Solution**: Make sure you're logged in first. Go to login.html and sign in.

### Issue: Expenses not loading
**Solution**: Check browser console for errors. Ensure Firebase is configured correctly.

### Issue: Horizontal scrolling on mobile
**Solution**: This should not happen. If it does, report as a bug.

### Issue: Modals not closing
**Solution**: Click the X button, Cancel button, or click outside the modal.

### Issue: Export not working
**Solution**: Ensure you have expenses to export. Check browser console for errors.

## Performance Benchmarks

- Page load: < 2 seconds
- Add expense: < 1 second
- Filter/Search: < 300ms (debounced)
- Export: < 1 second for 100 expenses

## Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Accessibility Testing

- [ ] Tab navigation works
- [ ] Focus states visible
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Buttons have proper labels

## Data Validation

### Amount Field
- Must be a number
- Must be greater than 0
- Accepts decimals (e.g., 123.45)

### Category Field
- Required
- Must select from dropdown
- Options: Groceries, Transportation, Utilities, Entertainment, Healthcare, Shopping, Dining, Education

### Description Field
- Optional
- Max length: 200 characters

### Date Field
- Required
- Must be valid date
- Cannot be in the future

### Payment Method Field
- Required
- Must select from dropdown
- Options: Cash, Card, UPI, Bank Transfer, Wallet

## Sample Test Data

```javascript
// Add these expenses for testing
{
  amount: 500,
  category: "Groceries",
  description: "Weekly groceries from supermarket",
  date: "2026-01-02",
  paymentMethod: "Card"
}

{
  amount: 150,
  category: "Transportation",
  description: "Uber ride to office",
  date: "2026-01-01",
  paymentMethod: "UPI"
}

{
  amount: 2000,
  category: "Utilities",
  description: "Electricity bill",
  date: "2025-12-31",
  paymentMethod: "Bank Transfer"
}
```

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Device (desktop/mobile)
3. Steps to reproduce
4. Expected behavior
5. Actual behavior
6. Screenshots (if applicable)
7. Console errors (if any)

---

**Happy Testing!** 🎉
