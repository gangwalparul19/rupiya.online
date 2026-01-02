# House & Vehicle Expense/Income Tracking - Implementation Plan

## Overview
Add expense and income tracking functionality to both Houses and Vehicles pages. Users can add expenses/income linked to specific properties or vehicles, which will be stored in the main expenses/income collections with reference IDs.

## Requirements

### Houses Page
1. **Simplify Form** - Remove purchase/sale tracking fields
   - Remove: purchasePrice, currentValue, purchaseDate, monthlyRent, monthlyMaintenance
   - Add: ownership status (Owned/Rented/Leased)
   - Keep: name, type, address, area, notes

2. **Add Expense/Income Buttons** on each house card
   - "Add Expense" button (maintenance, repairs, taxes, etc.)
   - "Add Income" button (rent received, if owned and rented out)

3. **Update Summary Cards**
   - Total Properties (count)
   - Total Income (from house-related income)
   - Total Expenses (from house-related expenses)

### Vehicles Page
1. **Already Simplified** ✅
   - Current fields: name, type, make, model, year, registrationNumber, currentMileage, fuelType, insuranceExpiry, color, notes

2. **Add Expense/Income Buttons** on each vehicle card
   - "Add Expense" button (fuel, maintenance, repairs, insurance, etc.)
   - "Add Income" button (Ola/Uber earnings, if used commercially)

3. **Update Summary Cards**
   - Total Vehicles (count) ✅
   - Total Fuel & Maintenance Cost (from vehicle-related expenses)
   - Total Income (from vehicle-related income, e.g., Ola/Uber)

## Data Structure

### Expense Document (with house/vehicle reference)
```javascript
{
  amount: number,
  category: string,  // "House Maintenance", "Vehicle Fuel", etc.
  description: string,
  date: Timestamp,
  paymentMethod: string,
  
  // NEW FIELDS
  linkedType: string,  // "house" or "vehicle"
  linkedId: string,    // ID of the house or vehicle
  linkedName: string,  // Name of the house or vehicle (for display)
  
  userId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Income Document (with house/vehicle reference)
```javascript
{
  amount: number,
  source: string,  // "House Rent", "Vehicle Earnings", etc.
  description: string,
  date: Timestamp,
  paymentMethod: string,
  
  // NEW FIELDS
  linkedType: string,  // "house" or "vehicle"
  linkedId: string,    // ID of the house or vehicle
  linkedName: string,  // Name of the house or vehicle (for display)
  
  userId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Implementation Steps

### Step 1: Update Houses Page

#### 1.1 Update houses.html
- [x] Simplify form fields
- [x] Update summary card IDs and labels
- [ ] Add expense/income buttons to house cards

#### 1.2 Update houses.js
- [ ] Remove purchasePrice, currentValue, purchaseDate, monthlyRent, monthlyMaintenance from form handling
- [ ] Add ownership field
- [ ] Update renderHouses() to show simplified card with expense/income buttons
- [ ] Add functions: showAddExpenseForm(houseId), showAddIncomeForm(houseId)
- [ ] Update summary calculation to fetch house-related expenses/income

#### 1.3 Update houses.css
- [ ] Remove appreciation/value-related styles
- [ ] Add styles for expense/income buttons on cards

### Step 2: Update Vehicles Page

#### 2.1 Update vehicles.html
- [ ] Add expense/income buttons to vehicle cards

#### 2.2 Update vehicles.js
- [ ] Update renderVehicles() to show expense/income buttons
- [ ] Add functions: showAddExpenseForm(vehicleId), showAddIncomeForm(vehicleId)
- [ ] Update summary calculation to fetch vehicle-related expenses/income

#### 2.3 Update vehicles.css
- [ ] Add styles for expense/income buttons on cards

### Step 3: Create Expense/Income Forms

#### 3.1 Add Inline Forms to Both Pages
- [ ] Add expense form section (similar to add house/vehicle form)
- [ ] Add income form section
- [ ] Forms should pre-populate category/source based on linked type
- [ ] Forms should include hidden fields for linkedType, linkedId, linkedName

#### 3.2 Form Categories
**House Expenses:**
- Maintenance & Repairs
- Property Tax
- Insurance
- Utilities
- HOA Fees
- Other

**House Income:**
- Rent Received
- Lease Payment
- Other

**Vehicle Expenses:**
- Fuel
- Maintenance & Repairs
- Insurance
- Registration & Taxes
- Parking & Tolls
- Other

**Vehicle Income:**
- Ride-sharing (Ola/Uber)
- Delivery Services
- Rental Income
- Other

### Step 4: Update Firestore Service

#### 4.1 Update addExpense() and addIncome()
- Already supports additional fields
- No changes needed ✅

#### 4.2 Add Query Methods
```javascript
// Get expenses for a specific house/vehicle
async getExpensesByLinked(linkedType, linkedId)

// Get income for a specific house/vehicle
async getIncomeByLinked(linkedType, linkedId)

// Get total expenses by linked type
async getTotalExpensesByType(linkedType)

// Get total income by linked type
async getTotalIncomeByType(linkedType)
```

### Step 5: Update Summary Calculations

#### 5.1 Houses Page
```javascript
async function updateSummary() {
  const totalHouses = houses.length;
  
  // Fetch house-related expenses and income
  const houseExpenses = await firestoreService.getTotalExpensesByType('house');
  const houseIncome = await firestoreService.getTotalIncomeByType('house');
  
  totalHousesEl.textContent = totalHouses;
  totalIncomeEl.textContent = formatCurrency(houseIncome);
  totalExpensesEl.textContent = formatCurrency(houseExpenses);
}
```

#### 5.2 Vehicles Page
```javascript
async function updateSummary() {
  const totalVehicles = vehicles.length;
  
  // Fetch vehicle-related expenses and income
  const vehicleExpenses = await firestoreService.getTotalExpensesByType('vehicle');
  const vehicleIncome = await firestoreService.getTotalIncomeByType('vehicle');
  
  totalVehiclesEl.textContent = totalVehicles;
  totalExpensesEl.textContent = formatCurrency(vehicleExpenses);
  totalIncomeEl.textContent = formatCurrency(vehicleIncome);
}
```

## UI/UX Considerations

### Card Actions Layout
```
[House/Vehicle Card]
  [Edit] [Delete] [Add Expense] [Add Income]
```

### Mobile Responsive
- Stack buttons vertically on mobile
- Use icon-only buttons with tooltips

### Form Flow
1. User clicks "Add Expense" on a house card
2. Expense form opens with:
   - Pre-selected category (House Maintenance)
   - Hidden fields: linkedType="house", linkedId="xxx", linkedName="Main Residence"
   - User fills amount, description, date, payment method
3. On save, expense is added to main expenses collection with linked fields
4. Summary cards update automatically

## Testing Checklist

- [ ] Add house with simplified fields
- [ ] Edit house with new fields
- [ ] Add expense to house
- [ ] Add income to house
- [ ] Verify expense appears in main expenses page with house reference
- [ ] Verify income appears in main income page with house reference
- [ ] Summary cards show correct totals
- [ ] Add vehicle expense (fuel, maintenance)
- [ ] Add vehicle income (Ola/Uber)
- [ ] Verify vehicle expenses/income in main pages
- [ ] Mobile responsive layout works
- [ ] All forms validate correctly

## Files to Modify

1. `rupiya-vanilla/houses.html` - Simplify form, add expense/income buttons
2. `rupiya-vanilla/assets/js/pages/houses.js` - Update logic, add expense/income functions
3. `rupiya-vanilla/assets/css/houses.css` - Update styles
4. `rupiya-vanilla/vehicles.html` - Add expense/income buttons
5. `rupiya-vanilla/assets/js/pages/vehicles.js` - Add expense/income functions
6. `rupiya-vanilla/assets/css/vehicles.css` - Add button styles
7. `rupiya-vanilla/assets/js/services/firestore-service.js` - Add query methods

## Benefits

1. **Unified Tracking**: All expenses and income in one place
2. **Context**: Know which house/vehicle each transaction relates to
3. **Analytics**: Can analyze costs per property/vehicle
4. **Reporting**: Filter expenses/income by house or vehicle
5. **Simplified Entry**: Pre-populated categories based on context

## Next Steps

1. Complete houses page simplification
2. Add expense/income forms to both pages
3. Update firestore service with query methods
4. Implement summary calculations
5. Test end-to-end flow
6. Update documentation
