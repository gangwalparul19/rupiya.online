# Income Page - Quick Start Guide

## Access the Page

1. **Start Local Server**
   ```bash
   cd rupiya-vanilla
   python -m http.server 8000
   ```

2. **Open in Browser**
   ```
   http://localhost:8000/income.html
   ```

3. **Login**
   - Email: `test@rupiya.com`
   - Password: `Test@123456`

## Quick Actions

### Add Income
1. Click "Add Income" button
2. Fill in the form:
   - Amount: Enter amount (e.g., 50000)
   - Source: Select source (e.g., Salary)
   - Date: Select date
   - Payment Method: Select method (e.g., Bank Transfer)
   - Description: Optional description
3. Click "Save Income"

### Edit Income
1. Click the edit icon (pencil) on any income card
2. Modify the fields
3. Click "Update Income"

### Delete Income
1. Click the delete icon (trash) on any income card
2. Confirm deletion in the modal
3. Click "Delete"

### Filter Income
1. Click "Filters" button (mobile) or use filters directly (desktop)
2. Select filters:
   - Source: Filter by income source
   - Payment Method: Filter by payment method
   - Date Range: Select from/to dates
3. Results update automatically

### Search Income
1. Type in the search box
2. Results filter as you type
3. Searches in description field

### Export Income
1. Click "Export" button
2. CSV file downloads automatically
3. Filename includes current date

## Income Sources

- **Salary** - Regular employment income
- **Freelance** - Freelance work payments
- **Business** - Business revenue
- **Investment** - Investment returns
- **Rental** - Rental income
- **Gift** - Monetary gifts
- **Bonus** - Work bonuses
- **Other** - Other income sources

## Payment Methods

- **Cash** - Cash payments
- **Bank Transfer** - Direct bank transfers
- **Cheque** - Cheque payments
- **UPI** - UPI transactions
- **Card** - Card payments

## Tips

- Income amounts are displayed in **green**
- Use filters to find specific income entries
- Export regularly for record keeping
- Description field helps with future reference
- Date cannot be in the future

## Keyboard Shortcuts

- **Tab** - Navigate between fields
- **Enter** - Submit form
- **Escape** - Close form (when focused)

## Mobile Usage

- Tap hamburger menu to open sidebar
- Tap "Filters" to show/hide filters
- Swipe to scroll through income cards
- Tap edit/delete icons on cards
- Form is full-width on mobile

## Common Issues

### Issue: Can't add income
**Solution**: Check all required fields are filled and amount is greater than 0

### Issue: Date validation error
**Solution**: Ensure date is not in the future

### Issue: Filters not working
**Solution**: Click "Clear Filters" and try again

### Issue: Export not working
**Solution**: Ensure you have income entries to export

## Sample Data

```javascript
// Example income entry
{
  amount: 50000,
  source: "Salary",
  description: "Monthly salary for December",
  date: "2026-01-01",
  paymentMethod: "Bank Transfer"
}
```

---

**Happy Tracking!** 💰
