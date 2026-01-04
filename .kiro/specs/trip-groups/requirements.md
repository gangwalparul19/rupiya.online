# Requirements Document

## Introduction

This feature enables users to create trip/event groups where multiple friends can track shared expenses together. Each expense added to a trip group is also recorded in the user's personal expense account, while simultaneously being tracked within the group for settlement purposes. This is similar to apps like Splitwise but integrated with personal expense tracking.

## Glossary

- **Trip_Group**: A temporary group created for a specific trip or event where members share expenses
- **Group_Member**: A participant in a trip group (can be a Rupiya user or a non-user identified by name/phone)
- **Group_Expense**: An expense added to a trip group that tracks who paid and how it should be split
- **Settlement**: The process of balancing debts between group members
- **Balance**: The net amount a member owes or is owed within a group
- **System**: The Rupiya expense tracking application

## Requirements

### Requirement 1: Create Trip Group

**User Story:** As a user, I want to create a trip group with a name and add friends, so that we can track shared expenses for our trip together.

#### Acceptance Criteria

1. WHEN a user clicks "Create Trip Group", THE System SHALL display a form to enter group name, description, and start/end dates
2. WHEN a user submits the group creation form with valid data, THE System SHALL create the group and set the creator as admin
3. WHEN creating a group, THE System SHALL allow adding members by name, email, or phone number
4. WHEN a member is added who is not a Rupiya user, THE System SHALL create a placeholder member record with their contact info
5. WHEN a member is added who is a Rupiya user, THE System SHALL send them an invitation notification
6. IF the group name is empty, THEN THE System SHALL display a validation error and prevent submission

### Requirement 2: Add Expense to Trip Group

**User Story:** As a group member, I want to add an expense to the trip group, so that it gets tracked both in my personal account and in the group for splitting.

#### Acceptance Criteria

1. WHEN a user adds an expense to a trip group, THE System SHALL record it in the user's personal expenses with a reference to the group
2. WHEN adding a group expense, THE System SHALL allow selecting who paid (self or another member)
3. WHEN adding a group expense, THE System SHALL allow choosing split type: equal, custom amounts, or percentage
4. WHEN an expense is added, THE System SHALL automatically calculate each member's share based on split type
5. WHEN an expense is added with equal split, THE System SHALL divide the amount equally among selected participants
6. WHEN an expense is added, THE System SHALL update the group balances for all affected members
7. IF the expense amount is zero or negative, THEN THE System SHALL reject the expense with an error message

### Requirement 3: View Group Balances

**User Story:** As a group member, I want to see who owes whom in the group, so that I know the settlement status.

#### Acceptance Criteria

1. WHEN a user views a trip group, THE System SHALL display a summary showing total group expenses
2. WHEN viewing group balances, THE System SHALL show each member's net balance (positive = owed money, negative = owes money)
3. WHEN viewing balances, THE System SHALL display simplified debts (minimized number of transactions needed to settle)
4. WHEN a user's balance is positive, THE System SHALL display it in green with "You are owed" label
5. WHEN a user's balance is negative, THE System SHALL display it in red with "You owe" label

### Requirement 4: Settle Debts

**User Story:** As a group member, I want to record settlements between members, so that we can track who has paid back whom.

#### Acceptance Criteria

1. WHEN a user records a settlement, THE System SHALL update the balances of both parties involved
2. WHEN recording a settlement, THE System SHALL require the amount and the two parties involved
3. WHEN a settlement is recorded, THE System SHALL add it to the group's transaction history
4. WHEN all balances in a group reach zero, THE System SHALL mark the group as "Fully Settled"
5. IF a settlement amount exceeds the debt owed, THEN THE System SHALL warn the user but allow the transaction

### Requirement 5: View Group Expense History

**User Story:** As a group member, I want to see all expenses and settlements in the group, so that I can review the trip's financial history.

#### Acceptance Criteria

1. WHEN viewing a trip group, THE System SHALL display a chronological list of all expenses and settlements
2. WHEN viewing an expense, THE System SHALL show who paid, the amount, description, date, and split details
3. WHEN viewing the history, THE System SHALL allow filtering by date range, category, or member
4. WHEN viewing an expense, THE System SHALL indicate if it was added by the current user

### Requirement 6: Manage Group Members

**User Story:** As a group admin, I want to manage group members, so that I can add or remove participants as needed.

#### Acceptance Criteria

1. WHEN a group admin adds a new member, THE System SHALL update all existing expense splits if the member is added to "all expenses"
2. WHEN a group admin removes a member with zero balance, THE System SHALL remove them from the group
3. IF a group admin tries to remove a member with non-zero balance, THEN THE System SHALL require settling the balance first
4. WHEN a member leaves a group voluntarily, THE System SHALL require their balance to be zero

### Requirement 7: Close/Archive Trip Group

**User Story:** As a group admin, I want to close a trip group when the trip is over, so that it moves to archived status.

#### Acceptance Criteria

1. WHEN a group admin closes a group, THE System SHALL move it to "Archived" status
2. WHEN a group is archived, THE System SHALL prevent new expenses from being added
3. WHEN a group is archived, THE System SHALL still allow viewing history and recording settlements
4. WHEN all balances are settled in an archived group, THE System SHALL mark it as "Completed"

### Requirement 8: Personal Expense Integration

**User Story:** As a user, I want my group expenses to appear in my personal expense list, so that I have a complete view of my spending.

#### Acceptance Criteria

1. WHEN a group expense is added where the user paid, THE System SHALL create a personal expense record for the full amount
2. WHEN viewing personal expenses, THE System SHALL show a badge/tag indicating the expense is part of a trip group
3. WHEN clicking on a group-linked expense, THE System SHALL allow navigating to the trip group details
4. WHEN a group expense is deleted, THE System SHALL also remove the linked personal expense (with confirmation)

### Requirement 9: Non-User Notifications

**User Story:** As a group admin, I want to notify non-Rupiya members about expenses and settlements via SMS/WhatsApp, so that they stay informed about the group finances.

#### Acceptance Criteria

1. WHEN a non-Rupiya member is added to a group, THE System SHALL store their phone number for notifications
2. WHEN an expense is added that affects a non-Rupiya member, THE System SHALL send them a WhatsApp/SMS notification with expense details
3. WHEN a settlement involves a non-Rupiya member, THE System SHALL notify them via WhatsApp/SMS
4. WHEN sending notifications, THE System SHALL include a summary of their current balance in the group
5. WHEN a user opts out of notifications, THE System SHALL stop sending them messages
6. IF the phone number is invalid, THEN THE System SHALL display an error and skip notification for that member

### Requirement 10: Trip-Specific Categories

**User Story:** As a user, I want trip-specific expense categories, so that I can better organize and analyze trip expenses.

#### Acceptance Criteria

1. WHEN creating a trip group, THE System SHALL provide default trip categories: Accommodation, Transport, Food & Dining, Activities, Shopping, Tips, and Other
2. WHEN adding an expense to a trip group, THE System SHALL display trip-specific categories instead of regular expense categories
3. WHEN viewing trip summary, THE System SHALL show expense breakdown by trip category
4. WHEN a group admin creates a custom category, THE System SHALL add it to the group's category list
5. WHEN viewing trip analytics, THE System SHALL display pie chart or bar chart of spending by category

### Requirement 11: Trip Budget Planning

**User Story:** As a group admin, I want to set a trip budget, so that the group can track spending against the planned budget.

#### Acceptance Criteria

1. WHEN creating or editing a trip group, THE System SHALL allow setting an overall trip budget amount
2. WHEN a budget is set, THE System SHALL display a progress bar showing spent vs budget
3. WHEN expenses reach 80% of budget, THE System SHALL display a warning notification to all members
4. WHEN expenses exceed the budget, THE System SHALL display an alert with the overspend amount
5. WHEN viewing the trip dashboard, THE System SHALL show remaining budget and average daily spend
6. WHEN setting budget, THE System SHALL allow setting per-category budgets (optional)
7. IF per-category budgets are set, THEN THE System SHALL track and warn when individual categories exceed their budget
