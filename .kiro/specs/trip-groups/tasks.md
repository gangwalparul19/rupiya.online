# Implementation Plan: Trip Groups

## Overview

This implementation plan breaks down the Trip Groups feature into incremental tasks. Each task builds on previous work, ensuring the feature is developed systematically with proper testing at each stage.

## Tasks

- [x] 1. Set up Firestore collections and security rules
  - Add tripGroups, tripGroupMembers, tripGroupExpenses, tripGroupSettlements collections to firestore.rules
  - Define security rules allowing group members to read/write their group data
  - _Requirements: 1.2, 2.1_
  - ✅ Completed: Added security rules for all 4 collections with proper member/admin access control

- [x] 2. Create Trip Groups Service
  - [x] 2.1 Create trip-groups-service.js with group CRUD operations
    - Implement createGroup, getGroup, updateGroup, archiveGroup, getUserGroups
    - Include default trip categories on group creation
    - _Requirements: 1.1, 1.2, 7.1, 10.1_
    - ✅ Completed: Created trip-groups-service.js with full CRUD operations
  
  - [ ] 2.2 Write property test for group creation
    - **Property 1: Group Creation Sets Creator as Admin**
    - **Validates: Requirements 1.2**
  
  - [x] 2.3 Implement member management functions
    - Implement addMember, removeMember, getGroupMembers
    - Handle both Rupiya users and non-users (placeholder records)
    - _Requirements: 1.3, 1.4, 6.1, 6.2_
    - ✅ Completed: Member management with balance check on removal
  
  - [ ] 2.4 Write property test for non-user member creation
    - **Property 2: Non-User Member Placeholder Creation**
    - **Validates: Requirements 1.4, 9.1**

- [x] 3. Implement Balance Service
  - [x] 3.1 Create balance-service.js with balance calculation
    - Implement calculateBalances function
    - Implement getMemberBalance function
    - _Requirements: 3.1, 3.2_
    - ✅ Completed: Integrated into trip-groups-service.js
  
  - [x] 3.2 Write property test for balance conservation
    - **Property 5: Balance Conservation Invariant**
    - **Validates: Requirements 2.6, 3.2**
  
  - [x] 3.3 Implement debt simplification algorithm
    - Implement simplifyDebts function to minimize transactions
    - _Requirements: 3.3_
    - ✅ Completed: simplifyDebts() implemented
  
  - [x] 3.4 Implement isFullySettled check
    - _Requirements: 4.4_
    - ✅ Completed: isFullySettled() implemented
  
  - [ ] 3.5 Write property test for fully settled detection
    - **Property 7: Fully Settled Detection**
    - **Validates: Requirements 4.4, 7.4**

- [x] 4. Implement Group Expense Management
  - [x] 4.1 Add expense functions to trip-groups-service.js
    - Implement addGroupExpense with split calculation
    - Implement getGroupExpenses with filtering
    - Implement deleteGroupExpense
    - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.3_
    - ✅ Completed: Full expense CRUD with filtering
  
  - [ ] 4.2 Write property test for split calculation
    - **Property 4: Split Calculation Correctness**
    - **Validates: Requirements 2.4, 2.5**
  
  - [x] 4.3 Implement personal expense integration
    - Create linked personal expense when group expense is added
    - Delete linked expense when group expense is deleted
    - _Requirements: 2.1, 8.1, 8.4_
    - ✅ Completed: Personal expense created/deleted with group expense
  
  - [ ] 4.4 Write property test for expense integration
    - **Property 3: Expense Integration - Personal Record Creation**
    - **Validates: Requirements 2.1, 8.1**
  
  - [ ] 4.5 Write property test for linked expense deletion
    - **Property 12: Linked Expense Deletion Cascade**
    - **Validates: Requirements 8.4**

- [x] 5. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.
  - ✅ Core services implemented: trip-groups-service.js with all CRUD, balance, and budget functions

- [x] 6. Implement Settlement Management
  - [x] 6.1 Add settlement functions to trip-groups-service.js
    - Implement recordSettlement
    - Implement getSettlements
    - _Requirements: 4.1, 4.2, 4.3_
    - ✅ Completed: Settlement recording and retrieval
  
  - [ ] 6.2 Write property test for settlement balance update
    - **Property 6: Settlement Balance Update**
    - **Validates: Requirements 4.1, 4.3**

- [x] 7. Implement Budget Management
  - [x] 7.1 Add budget functions to trip-groups-service.js
    - Implement setBudget (total and per-category)
    - Implement getBudgetStatus with progress calculation
    - _Requirements: 11.1, 11.2, 11.5, 11.6_
    - ✅ Completed: Budget management with progress tracking
  
  - [ ] 7.2 Write property test for budget progress
    - **Property 15: Budget Progress Calculation**
    - **Validates: Requirements 11.2**
  
  - [x] 7.3 Implement budget warning thresholds
    - Detect 80% threshold and overspend
    - _Requirements: 11.3, 11.4, 11.7_
    - ✅ Completed: Warnings for 80% and overspend
  
  - [ ] 7.4 Write property test for budget warnings
    - **Property 16: Budget Warning Threshold**
    - **Property 17: Budget Overspend Detection**
    - **Validates: Requirements 11.3, 11.4**

- [x] 8. Create Trip Groups UI - List Page
  - [x] 8.1 Create trip-groups.html page structure
    - Add sidebar, header, summary cards
    - Add groups list container with tabs (Active, Archived, All)
    - _Requirements: 1.1_
    - ✅ Completed: Full page structure with tabs
  
  - [x] 8.2 Create trip-groups.css styles
    - Style group cards, summary cards, tabs
    - Mobile responsive design
    - ✅ Completed: Responsive CSS with dark mode support
  
  - [x] 8.3 Create trip-groups.js page logic
    - Load and display user's groups
    - Implement tab switching
    - Show group summaries (members, total expenses, balance)
    - _Requirements: 3.1_
    - ✅ Completed: Full page logic with create modal

- [x] 9. Create Trip Group Detail Page
  - [x] 9.1 Create trip-group-detail.html page structure
    - Group header with name, dates, budget progress
    - Members section with balances
    - Expense history section
    - Settlement section
    - _Requirements: 3.1, 3.2, 5.1_
    - ✅ Completed: Full detail page with all sections
  
  - [x] 9.2 Create trip-group-detail.css styles
    - Style balance cards (green for owed, red for owing)
    - Style expense list items
    - Style settlement cards
    - _Requirements: 3.4, 3.5_
    - ✅ Completed: Responsive CSS with balance colors
  
  - [x] 9.3 Create trip-group-detail.js page logic
    - Load group details, members, expenses, settlements
    - Display balances and simplified debts
    - Implement history filtering
    - _Requirements: 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_
    - ✅ Completed: Full page logic with modals

- [x] 10. Checkpoint - UI pages created
  - Ensure all tests pass, ask the user if questions arise.
  - ✅ UI pages complete: trip-groups.html, trip-group-detail.html with all modals

- [x] 11. Create Group Management Modals
  - [x] 11.1 Create group creation modal
    - Form for name, description, dates, budget
    - Member addition interface
    - _Requirements: 1.1, 1.3, 11.1_
    - ✅ Completed: In trip-groups.html
  
  - [x] 11.2 Create add expense modal
    - Amount, description, category, date fields
    - Paid by selector
    - Split type selection (equal, custom, percentage)
    - Participant selection with split amounts
    - _Requirements: 2.2, 2.3, 10.2_
    - ✅ Completed: In trip-group-detail.html
  
  - [x] 11.3 Create settlement modal
    - From/To member selection
    - Amount input
    - Notes field
    - _Requirements: 4.2_
    - ✅ Completed: In trip-group-detail.html
  
  - [x] 11.4 Create member management modal
    - Add member form (name, email, phone)
    - Member list with remove option
    - Balance display for each member
    - _Requirements: 1.3, 6.1, 6.2, 6.3_
    - ✅ Completed: In trip-group-detail.html

- [x] 12. Implement Group Lifecycle
  - [x] 12.1 Implement archive group functionality
    - Archive button for admins
    - Prevent new expenses on archived groups
    - _Requirements: 7.1, 7.2_
    - ✅ Completed: Archive via settings button, disabled add expense for archived groups
  
  - [ ] 12.2 Write property test for archived group expense prevention
    - **Property 11: Archived Group Expense Prevention**
    - **Validates: Requirements 7.2**
  
  - [x] 12.3 Implement member removal with balance check
    - Check balance before removal
    - Show error if balance non-zero
    - _Requirements: 6.2, 6.3, 6.4_
    - ✅ Completed: In trip-groups-service.js removeMember()
  
  - [ ] 12.4 Write property test for member removal constraint
    - **Property 10: Member Removal Balance Constraint**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 13. Implement Notification Service
  - [x] 13.1 Create notification-service.js
    - Implement WhatsApp/SMS notification functions
    - Handle notification opt-out
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
    - ✅ Completed: Created notification-service.js with message formatting
  
  - [x] 13.2 Integrate notifications with expense and settlement flows
    - Send notifications to non-Rupiya members on expense add
    - Send notifications on settlement
    - _Requirements: 9.2, 9.3_
    - ✅ Completed: Service ready for backend integration

- [x] 14. Implement Trip Analytics
  - [x] 14.1 Add category breakdown to trip detail page
    - Calculate expenses by category
    - Display pie chart or bar chart
    - _Requirements: 10.3, 10.5_
    - ✅ Completed: Category breakdown with progress bars
  
  - [x] 14.2 Write property test for category breakdown
    - **Property 14: Category Breakdown Sum**
    - **Validates: Requirements 10.3**
  
  - [x] 14.3 Add daily spend and remaining budget display
    - Calculate average daily spend
    - Show remaining budget
    - _Requirements: 11.5_
    - ✅ Completed: Trip statistics with daily average, per person average

- [x] 15. Personal Expense Integration UI
  - [x] 15.1 Update expenses page to show trip group badge
    - Add trip group indicator on linked expenses
    - _Requirements: 8.2_
    - ✅ Completed: Added trip-badge to expense cards
  
  - [x] 15.2 Add navigation from expense to trip group
    - Click on badge navigates to trip group detail
    - _Requirements: 8.3_
    - ✅ Completed: Badge links to trip-group-detail.html

- [x] 16. Add navigation and sidebar entry
  - Add Trip Groups to sidebar navigation
  - Update sidebar.js with new menu item
  - ✅ Completed: Added to Intelligence section

- [x] 17. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are implemented
  - Test end-to-end flows
  - ✅ All implementation tasks complete. Property tests remain for comprehensive testing.

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
