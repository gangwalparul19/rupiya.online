# Budgets Progress Bar - Visual Guide

## How Progress Bars Work

Each budget card displays a **progress bar** that shows how much of your budget has been spent. The progress bar is located **inside each budget card**, not as a separate element.

## Example Scenario

### Budget Setup:
- **Category**: Groceries
- **Budget Amount**: ₹10,000
- **Spent**: ₹8,000
- **Remaining**: ₹2,000
- **Percentage**: 80%

## Budget Card Layout

```
┌─────────────────────────────────────────┐
│  Groceries                    [Edit][X] │  ← Header
│  December 2025                          │
├─────────────────────────────────────────┤
│  Budget        Spent        Remaining   │  ← Amounts
│  ₹10,000      ₹8,000         ₹2,000    │
├─────────────────────────────────────────┤
│  ████████████████░░░░  80%             │  ← Progress Bar
│  ₹8,000 of ₹10,000                     │
├─────────────────────────────────────────┤
│  ⚠️ 80% of budget used                 │  ← Alert (if threshold reached)
└─────────────────────────────────────────┘
```

## Progress Bar Colors

### 1. Normal (< 80% by default)
```
Budget: ₹10,000
Spent:  ₹5,000 (50%)

Progress Bar: BLUE
┌─────────────────────────────────────────┐
│  ██████████░░░░░░░░░░  50%             │
│  ₹5,000 of ₹10,000                     │
└─────────────────────────────────────────┘
```

### 2. Warning (80% - 99%)
```
Budget: ₹10,000
Spent:  ₹8,500 (85%)

Progress Bar: ORANGE
┌─────────────────────────────────────────┐
│  █████████████████░░  85%              │
│  ₹8,500 of ₹10,000                     │
│  ⚠️ 85% of budget used                 │
└─────────────────────────────────────────┘
```

### 3. Danger (≥ 100%)
```
Budget: ₹10,000
Spent:  ₹12,000 (120%)

Progress Bar: RED (capped at 100% width)
┌─────────────────────────────────────────┐
│  ████████████████████  120%            │
│  ₹12,000 of ₹10,000                    │
│  ⚠️ Budget exceeded!                   │
└─────────────────────────────────────────┘
```

## Multiple Budgets Example

You can have **multiple budgets** for different categories. Each budget card has its own progress bar:

```
┌─────────────────────┐  ┌─────────────────────┐
│  Groceries          │  │  Transportation     │
│  ████████░░  80%    │  │  ████░░░░░░  40%    │
│  ₹8,000 / ₹10,000   │  │  ₹2,000 / ₹5,000    │
│  ⚠️ 80% used        │  │                     │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│  Dining             │  │  Entertainment      │
│  ██████████  100%   │  │  ██░░░░░░░  20%     │
│  ₹3,000 / ₹3,000    │  │  ₹500 / ₹2,500      │
│  ⚠️ Budget exceeded!│  │                     │
└─────────────────────┘  └─────────────────────┘
```

## Progress Bar Components

### 1. Visual Bar
- **Container**: Light gray background (full width)
- **Fill**: Colored bar showing percentage
  - Blue: Normal (< threshold)
  - Orange: Warning (≥ threshold, < 100%)
  - Red: Danger (≥ 100%)
- **Width**: Percentage of budget spent (max 100%)

### 2. Text Display
- **Left**: "₹X of ₹Y" (spent of budget)
- **Right**: "X%" (percentage)

### 3. Alert Badge (Optional)
- Shows when threshold reached or exceeded
- Warning (orange): "X% of budget used"
- Danger (red): "Budget exceeded!"

## Mobile Layout

### KPI Summary Cards (2 per row)
```
┌──────────────┐  ┌──────────────┐
│ 💰           │  │ 💸           │
│ Total Budget │  │ Total Spent  │
│ ₹25,000      │  │ ₹18,500      │
└──────────────┘  └──────────────┘

┌─────────────────────────────────┐
│ 💵                              │
│ Remaining                       │
│ ₹6,500                          │
└─────────────────────────────────┘
```

### Budget Cards (1 per row)
```
┌─────────────────────────────────┐
│  Groceries          [Edit] [X]  │
│  December 2025                  │
│                                 │
│  Budget:     ₹10,000            │
│  Spent:      ₹8,000             │
│  Remaining:  ₹2,000             │
│                                 │
│  ████████████████░░░░  80%      │
│  ₹8,000 of ₹10,000              │
│                                 │
│  ⚠️ 80% of budget used          │
└─────────────────────────────────┘
```

## How It Works

### 1. Budget Creation
- You create a budget for a category (e.g., Groceries)
- Set the budget amount (e.g., ₹10,000)
- Set the alert threshold (e.g., 80%)
- Select the month (e.g., December 2025)

### 2. Automatic Tracking
- System automatically tracks expenses in that category
- Filters expenses by:
  - Category matches budget category
  - Date within budget month
- Calculates total spent

### 3. Progress Calculation
```javascript
spent = sum of all matching expenses
remaining = budget - spent
percentage = (spent / budget) * 100
```

### 4. Visual Update
- Progress bar fills based on percentage
- Color changes based on status
- Alert appears when threshold reached

### 5. Real-time Updates
- When you add an expense in that category
- Progress bar updates automatically
- Spent amount increases
- Remaining amount decreases
- Alert may appear if threshold crossed

## Example Flow

### Step 1: Create Budget
```
Category: Groceries
Amount: ₹10,000
Month: December 2025
Alert: 80%
```

### Step 2: Add Expenses
```
Day 1:  Add ₹2,000 expense (Groceries)
        → Progress: 20% (Blue)

Day 5:  Add ₹3,000 expense (Groceries)
        → Progress: 50% (Blue)

Day 10: Add ₹3,500 expense (Groceries)
        → Progress: 85% (Orange + Warning)

Day 15: Add ₹2,000 expense (Groceries)
        → Progress: 105% (Red + Danger)
```

### Step 3: Monitor Progress
- View budget card
- See progress bar at 105%
- See "Budget exceeded!" alert
- Adjust spending or increase budget

## Summary Dashboard

At the top of the page, you see:

### Total Budget
Sum of all budgets for current month
```
Groceries:      ₹10,000
Transportation: ₹5,000
Dining:         ₹3,000
Entertainment:  ₹2,500
─────────────────────────
Total:          ₹20,500
```

### Total Spent
Sum of all spent amounts
```
Groceries:      ₹8,000
Transportation: ₹2,000
Dining:         ₹3,000
Entertainment:  ₹500
─────────────────────────
Total:          ₹13,500
```

### Total Remaining
```
Total Budget - Total Spent
₹20,500 - ₹13,500 = ₹7,000
```

## Key Points

1. **Each budget card has its own progress bar**
2. **Progress bars are inside the budget cards**
3. **You can have multiple budgets (one per category)**
4. **Each budget tracks its own category's expenses**
5. **Progress updates automatically when expenses added**
6. **Colors change based on spending level**
7. **Alerts appear when thresholds reached**
8. **Mobile shows 2 KPI cards per row, then 3rd full width**
9. **Budget cards stack vertically on mobile**

---

**The progress bar is NOT a separate page element - it's built into each budget card!**
