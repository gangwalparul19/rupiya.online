# Budgets Page - Mobile Layout Guide

## Mobile KPI Cards (2 per row)

### Layout Structure
```
┌─────────────────────────────────────┐
│  Budgets                            │
│  Set spending limits and track...   │
│  [Add Budget]                       │
├─────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐    │
│  │ 💰         │  │ 💸         │    │
│  │ Total      │  │ Total      │    │
│  │ Budget     │  │ Spent      │    │
│  │ ₹25,000    │  │ ₹18,500    │    │
│  └────────────┘  └────────────┘    │
│  ┌─────────────────────────────┐   │
│  │ 💵                          │   │
│  │ Remaining                   │   │
│  │ ₹6,500                      │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Budget Cards (1 per row)           │
│  ┌─────────────────────────────┐   │
│  │ Groceries      [Edit] [Del] │   │
│  │ December 2025               │   │
│  │                             │   │
│  │ Budget:     ₹10,000         │   │
│  │ Spent:      ₹8,000          │   │
│  │ Remaining:  ₹2,000          │   │
│  │                             │   │
│  │ ████████████████░░░░  80%   │   │
│  │ ₹8,000 of ₹10,000           │   │
│  │                             │   │
│  │ ⚠️ 80% of budget used       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Transportation [Edit] [Del] │   │
│  │ December 2025               │   │
│  │                             │   │
│  │ Budget:     ₹5,000          │   │
│  │ Spent:      ₹2,000          │   │
│  │ Remaining:  ₹3,000          │   │
│  │                             │   │
│  │ ████████░░░░░░░░  40%       │   │
│  │ ₹2,000 of ₹5,000            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## KPI Cards Grid

### CSS Implementation
```css
/* Mobile: 2 cards per row */
.budget-summary {
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

/* Third card spans full width */
.summary-card:nth-child(3) {
  grid-column: 1 / -1;
}
```

### Visual Result
```
Row 1: [Total Budget] [Total Spent]
Row 2: [Remaining - Full Width]
```

## Budget Cards

### Each Card Contains:

1. **Header Section**
   - Category name (e.g., "Groceries")
   - Month (e.g., "December 2025")
   - Edit button
   - Delete button

2. **Amounts Section**
   - Budget: ₹10,000
   - Spent: ₹8,000 (red color)
   - Remaining: ₹2,000 (green/red based on status)

3. **Progress Bar Section**
   - Visual bar (colored based on status)
   - Text: "₹8,000 of ₹10,000"
   - Percentage: "80%"

4. **Alert Section** (if applicable)
   - Warning: "⚠️ 80% of budget used"
   - Danger: "⚠️ Budget exceeded!"

5. **Notes Section** (if provided)
   - Optional notes text

## Progress Bar Details

### Progress Bar is INSIDE each budget card:

```
┌─────────────────────────────────┐
│  Groceries          [Edit] [X]  │  ← Header
│  December 2025                  │
├─────────────────────────────────┤
│  Budget:     ₹10,000            │  ← Amounts
│  Spent:      ₹8,000             │
│  Remaining:  ₹2,000             │
├─────────────────────────────────┤
│  ████████████████░░░░  80%      │  ← PROGRESS BAR HERE
│  ₹8,000 of ₹10,000              │
├─────────────────────────────────┤
│  ⚠️ 80% of budget used          │  ← Alert (if needed)
└─────────────────────────────────┘
```

## Multiple Budgets Example

You can have **N number of budgets** (one per category):

```
┌─────────────────────────────────┐
│  Groceries                      │
│  ████████████████░░░░  80%      │  ← Progress bar
│  ⚠️ 80% used                    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Transportation                 │
│  ████████░░░░░░░░  40%          │  ← Progress bar
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Dining                         │
│  ██████████████████  100%       │  ← Progress bar
│  ⚠️ Budget exceeded!            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Entertainment                  │
│  ██░░░░░░░░░░░░░░  20%          │  ← Progress bar
└─────────────────────────────────┘

... and so on for each category
```

## How Progress Bars Work

### Example: Groceries Budget

**Setup:**
- Budget: ₹10,000
- Alert Threshold: 80%

**Day 1:** Add ₹2,000 expense
```
Progress: ████░░░░░░░░░░░░  20%
Status: Normal (Blue)
```

**Day 5:** Add ₹3,000 expense (Total: ₹5,000)
```
Progress: ██████████░░░░░░  50%
Status: Normal (Blue)
```

**Day 10:** Add ₹3,500 expense (Total: ₹8,500)
```
Progress: █████████████████░  85%
Status: Warning (Orange)
Alert: ⚠️ 85% of budget used
```

**Day 15:** Add ₹2,000 expense (Total: ₹10,500)
```
Progress: ████████████████████  105%
Status: Danger (Red)
Alert: ⚠️ Budget exceeded!
```

## Key Features

### 1. Automatic Tracking
- System tracks expenses automatically
- Filters by category and month
- Updates progress in real-time

### 2. Visual Indicators
- **Blue**: Under threshold (safe)
- **Orange**: At/above threshold (warning)
- **Red**: Over budget (danger)

### 3. Multiple Budgets
- Create one budget per category
- Each has its own progress bar
- Track multiple categories simultaneously

### 4. Mobile Optimized
- 2 KPI cards per row
- 3rd KPI card full width
- Budget cards stack vertically
- Touch-friendly buttons
- No horizontal scrolling

## Summary

✅ **KPI Cards**: 2 per row on mobile (3rd full width)
✅ **Progress Bars**: Inside each budget card
✅ **Multiple Budgets**: One card per category
✅ **Real-time Updates**: Automatic expense tracking
✅ **Color Coded**: Blue → Orange → Red
✅ **Alerts**: Warning and danger messages
✅ **Mobile Friendly**: Responsive layout

---

**The progress bar is a component of each budget card, not a separate element!**
