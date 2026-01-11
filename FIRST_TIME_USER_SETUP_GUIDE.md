# First-Time User Setup Guide

## What Changed

### Feature Configuration Updates
The feature system has been updated to provide a better onboarding experience for first-time users.

## Default Feature States

### ✅ Enabled by Default (Required)
These features are automatically enabled and cannot be disabled:
1. **Dashboard** - Main dashboard with financial overview
2. **Expenses** - Track your spending
3. **Notes** - Keep notes and reminders

### ❌ Disabled by Default
All other features start disabled and users can enable them during onboarding:
- Predictive Analytics
- AI Insights
- Income
- Split Expenses
- Recurring
- Budgets
- Goals
- Investments
- Loans & EMI
- Transfers
- Net Worth
- Houses
- Vehicles
- House Help
- Trip Groups
- Documents

## First-Time User Experience

### Step 1: Login
User logs in to their account for the first time.

### Step 2: Feature Onboarding Modal
The dashboard displays a feature onboarding modal with:
- All available features organized by category
- Required features pre-selected and disabled (cannot be unchecked)
- Optional features available for selection
- Real-time count of enabled features

### Step 3: Feature Selection
User can:
- See descriptions of each feature
- Toggle optional features on/off
- View the total number of enabled features
- Skip onboarding or proceed with selections

### Step 4: Get Started
User clicks "Get Started" to:
- Save their feature preferences to Firestore
- Mark onboarding as complete
- Access the dashboard with their selected features

## Feature Access After Onboarding

### Navigation
- Only enabled features appear in the sidebar navigation
- Disabled features are hidden from the UI
- Users can modify settings in Profile > Features tab

### Feature Details Page
- Users can view all available features with detailed descriptions
- Features show their current status (enabled/disabled)
- Required features are clearly marked
- Users can enable/disable features from this page

### Settings
- Profile > Features tab shows all features
- Users can toggle features on/off (except required ones)
- Changes are saved immediately
- Feature status is synced across all devices

## Technical Implementation

### Files Modified
1. **assets/js/config/feature-config.js**
   - Updated DEFAULT_FEATURES with correct enabled/disabled states
   - Marked Dashboard, Expenses, and Notes as required

### Files Already in Place
1. **assets/js/components/feature-onboarding.js**
   - Handles onboarding UI and flow
   - Saves user selections to Firestore

2. **dashboard.html**
   - Includes feature onboarding modal
   - Initializes onboarding on first load

3. **profile.html**
   - Features tab for managing feature settings
   - Moved before Categories tab

## Testing the Implementation

### Test New User Onboarding
1. Create a new user account
2. Log in for the first time
3. Verify onboarding modal appears on dashboard
4. Verify Dashboard, Expenses, and Notes are pre-selected and disabled
5. Select some optional features
6. Click "Get Started"
7. Verify selected features are now accessible

### Test Feature Access
1. Log in with the test account
2. Verify only enabled features appear in navigation
3. Go to Profile > Features
4. Verify feature toggles work correctly
5. Verify required features cannot be disabled
6. Enable/disable some features and verify changes persist

### Test Feature Details Page
1. Go to Profile > Features tab
2. Verify all features are listed with descriptions
3. Verify required features are marked
4. Verify feature status is accurate
5. Verify toggling features works

## User Benefits

1. **Simplified Onboarding** - New users aren't overwhelmed with all features
2. **Focused Experience** - Users start with essential features only
3. **Flexibility** - Users can enable additional features as needed
4. **Clear Guidance** - Required features are clearly marked
5. **Easy Management** - Feature settings are easily accessible

## Admin/Developer Notes

### Changing Default Features
To change which features are enabled by default:
1. Edit `assets/js/config/feature-config.js`
2. Modify the `enabled` property in `DEFAULT_FEATURES`
3. Set `required: true` for features that cannot be disabled
4. Changes apply to new users only

### Adding New Features
To add a new feature:
1. Add entry to `DEFAULT_FEATURES` in feature-config.js
2. Set `enabled: false` for new features (disabled by default)
3. Add category and description
4. Feature will appear in onboarding for new users

### Removing Features
To remove a feature:
1. Remove entry from `DEFAULT_FEATURES`
2. Feature will no longer appear in onboarding
3. Existing users with feature enabled will still have access

## FAQ

**Q: Can users disable required features?**
A: No, required features (Dashboard, Expenses, Notes) cannot be disabled. They're essential for the app to function properly.

**Q: Can users change their feature selections later?**
A: Yes, users can modify their feature settings anytime in Profile > Features tab.

**Q: What happens if a user skips onboarding?**
A: The default features (Dashboard, Expenses, Notes) remain enabled. Users can still modify settings later.

**Q: Are feature preferences synced across devices?**
A: Yes, preferences are stored in Firestore and synced across all devices.

**Q: Can existing users see the onboarding modal?**
A: No, onboarding only appears for first-time users. It's marked as complete after the first login.
