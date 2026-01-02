# Category Management - Testing Guide

## Quick Test Steps

### 1. Start the Server
```bash
cd rupiya-vanilla
python -m http.server 8000
```

### 2. Login
- Open: http://localhost:8000
- Login with: `test@rupiya.com` / `Test@123456`

### 3. Test Category Management

#### A. View Default Categories
1. Click on your profile (top right)
2. Click "Categories" tab
3. You should see:
   - **Expense Categories**: 16 default categories
   - **Income Categories**: 13 default categories

#### B. Add New Expense Category
1. In "Expense Categories" section
2. Type "Pet Care" in the input field
3. Click "Add" button (or press Enter)
4. ✅ Should see success toast
5. ✅ "Pet Care" should appear in the list

#### C. Add New Income Category
1. In "Income Categories" section
2. Type "Consulting" in the input field
3. Click "Add" button (or press Enter)
4. ✅ Should see success toast
5. ✅ "Consulting" should appear in the list

#### D. Test Duplicate Prevention
1. Try adding "Pet Care" again
2. ✅ Should see error toast: "Category already exists"

#### E. Use Custom Category in Expenses
1. Go to "Expenses" page (sidebar)
2. Click "Add Expense" button
3. Open the "Category" dropdown
4. ✅ Should see "Pet Care" in the list
5. Select "Pet Care"
6. Fill in amount: 500
7. Select payment method: Cash
8. Click "Save Expense"
9. ✅ Expense should be saved with "Pet Care" category

#### F. Use Custom Category in Income
1. Go to "Income" page (sidebar)
2. Click "Add Income" button
3. Open the "Source" dropdown
4. ✅ Should see "Consulting" in the list
5. Select "Consulting"
6. Fill in amount: 5000
7. Select payment method: Bank Transfer
8. Click "Save Income"
9. ✅ Income should be saved with "Consulting" source

#### G. Test Category in Budgets
1. Go to "Budgets" page (sidebar)
2. Click "Add Budget" button
3. Open the "Category" dropdown
4. ✅ Should see "Pet Care" in the list
5. Select "Pet Care"
6. Set amount: 2000
7. Select current month
8. Click "Save Budget"
9. ✅ Budget should be created for "Pet Care"

#### H. Test Category in Recurring
1. Go to "Recurring" page (sidebar)
2. Click "Add Recurring" button
3. Open the "Category" dropdown
4. ✅ Should see both "Pet Care" and "Consulting" in the list
5. Select "Pet Care"
6. Fill in details and save
7. ✅ Recurring transaction should be created

#### I. Delete a Category
1. Go back to Profile > Categories
2. Find "Pet Care" in expense categories
3. Click the X (delete) button
4. Confirm deletion
5. ✅ Should see success toast
6. ✅ "Pet Care" should be removed from list
7. Go to Expenses page
8. Click "Add Expense"
9. ✅ "Pet Care" should NOT be in dropdown anymore

#### J. Reset to Defaults
1. Go to Profile > Categories
2. Click "Reset to Defaults" button
3. Confirm reset
4. ✅ Should see success toast
5. ✅ All custom categories should be removed
6. ✅ Only default categories should remain
7. Go to Expenses page
8. ✅ Dropdown should only show default categories

### 4. Test Multi-User Isolation

#### A. User A - Add Custom Categories
1. Login as User A
2. Add custom categories (e.g., "Gym Membership", "Side Hustle")
3. Verify they appear in dropdowns

#### B. User B - Check Isolation
1. Logout from User A
2. Login as User B (different account)
3. Go to Profile > Categories
4. ✅ Should see only default categories
5. ✅ Should NOT see User A's custom categories

#### C. User A - Verify Persistence
1. Logout from User B
2. Login back as User A
3. Go to Profile > Categories
4. ✅ Should see custom categories still there
5. ✅ Categories should persist across sessions

## Expected Behavior

### ✅ Success Indicators
- Toast notifications appear for all actions
- Categories appear immediately after adding
- Categories disappear immediately after deleting
- Dropdowns update automatically across all pages
- Categories persist after page refresh
- Categories are user-specific (isolated)
- Enter key works for adding categories
- Duplicate prevention works
- Reset to defaults works correctly

### ❌ Common Issues to Check
- Categories not appearing in dropdowns → Check Firebase connection
- Categories not persisting → Check user authentication
- Duplicate categories → Check validation logic
- Categories appearing for wrong user → Check user ID in queries
- Dropdowns not updating → Check page initialization order

## Firebase Data Verification

### Check Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Look for `userCategories` collection
4. Each user should have one document with:
   ```
   {
     expenseCategories: [...],
     incomeCategories: [...],
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

## Browser Console Checks

### No Errors Expected
Open browser console (F12) and check for:
- ✅ No red errors
- ✅ Categories loaded successfully
- ✅ Firebase operations successful

### Expected Console Logs
```
Categories initialized
Categories loaded: {expenseCategories: [...], incomeCategories: [...]}
```

## Performance Checks

### Page Load Times
- Profile page should load categories instantly
- Expenses/Income pages should load categories before showing form
- No noticeable delay in dropdown population

### Network Requests
- Categories should be fetched once per page load
- No repeated requests for same data
- Efficient Firebase queries

## Accessibility Checks

### Keyboard Navigation
- Tab through category inputs
- Enter key should add categories
- Delete buttons should be keyboard accessible

### Screen Reader
- Labels should be properly associated
- Success/error messages should be announced
- Category lists should be navigable

## Mobile Testing

### Responsive Design
1. Open in mobile view (or use browser dev tools)
2. Go to Profile > Categories
3. ✅ Input fields should be full width
4. ✅ Add buttons should be easily tappable
5. ✅ Category lists should be scrollable
6. ✅ Delete buttons should be large enough to tap

## Status Indicators

### All Tests Passing ✅
- Category management UI works
- Add/delete/reset functionality works
- Categories appear in all dropdowns
- Categories persist across sessions
- Multi-user isolation works
- No console errors
- Mobile responsive

### Ready for Production ✅
- All features implemented
- No known bugs
- User-friendly interface
- Proper error handling
- Toast notifications working
- Firebase integration complete

## Next Steps After Testing

1. **If all tests pass:**
   - Mark feature as complete
   - Update user documentation
   - Deploy to production

2. **If issues found:**
   - Document specific issues
   - Check browser console for errors
   - Verify Firebase configuration
   - Check network requests
   - Review code for bugs

## Support

If you encounter any issues during testing:
1. Check browser console for errors
2. Verify Firebase connection
3. Check user authentication status
4. Review network requests in dev tools
5. Check Firestore rules and permissions
