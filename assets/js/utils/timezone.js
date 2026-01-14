// Timezone Utility Service
// Handles timezone detection and date/time formatting based on user's local timezone
// IMPORTANT: All dates are stored in UTC in Firestore but displayed in IST (Asia/Kolkata)

class TimezoneService {
  constructor() {
    // Always use IST (Asia/Kolkata) for the application
    this.userTimezone = 'Asia/Kolkata';
    this.userLocale = 'en-IN';
  }

  // Detect user's timezone from browser (kept for reference, but we use IST)
  detectTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      console.warn('Could not detect timezone, using Asia/Kolkata (IST)');
      return 'Asia/Kolkata'; // Default to IST
    }
  }

  // Detect user's locale from browser
  detectLocale() {
    try {
      const locale = navigator.language || navigator.userLanguage || 'en-IN';
      return locale;
    } catch (e) {
      return 'en-IN';
    }
  }

  // Get current timezone (always IST)
  getTimezone() {
    return this.userTimezone;
  }

  // Get current locale
  getLocale() {
    return this.userLocale;
  }

  // Get timezone offset in minutes (IST is UTC+5:30 = 330 minutes)
  getTimezoneOffset() {
    // IST offset is -330 (negative because it's ahead of UTC)
    return -330;
  }

  // Get timezone abbreviation (IST)
  getTimezoneAbbreviation() {
    return 'IST';
  }

  // Convert a date to user's local timezone
  toLocalDate(date) {
    if (!date) return null;
    
    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
      date = date.toDate();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    // Handle seconds (Firestore timestamp format)
    if (date.seconds) {
      date = new Date(date.seconds * 1000);
    }
    
    return date;
  }

  // Format date in user's timezone
  formatDate(date, options = {}) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: this.userTimezone
    };

    return localDate.toLocaleDateString(this.userLocale, { ...defaultOptions, ...options });
  }

  // Format date with time in user's timezone
  formatDateTime(date, options = {}) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.userTimezone
    };

    return localDate.toLocaleString(this.userLocale, { ...defaultOptions, ...options });
  }

  // Format time only in user's timezone
  formatTime(date, options = {}) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.userTimezone
    };

    return localDate.toLocaleTimeString(this.userLocale, { ...defaultOptions, ...options });
  }

  // Format date for input fields (YYYY-MM-DD) in user's timezone
  formatDateForInput(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    // Get the date parts in user's timezone
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: this.userTimezone 
    };
    
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(localDate);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  // Format date for datetime-local input (YYYY-MM-DDTHH:MM) in user's timezone
  formatDateTimeForInput(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.userTimezone 
    };
    
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(localDate);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  // Get current date/time in user's timezone
  now() {
    return new Date();
  }

  // Get today's date at midnight in user's timezone
  today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Get start of day in user's timezone (IST)
  startOfDay(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate) return null;
    
    // Create a date at midnight IST
    // We need to account for IST offset (UTC+5:30)
    const istDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate(), 0, 0, 0, 0);
  }

  // Get end of day in user's timezone (IST)
  endOfDay(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate) return null;
    
    // Create a date at 23:59:59 IST
    const istDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate(), 23, 59, 59, 999);
  }

  // Get start of month in user's timezone
  startOfMonth(date) {
    const localDate = this.toLocalDate(date) || new Date();
    return new Date(localDate.getFullYear(), localDate.getMonth(), 1, 0, 0, 0, 0);
  }

  // Get end of month in user's timezone
  endOfMonth(date) {
    const localDate = this.toLocalDate(date) || new Date();
    return new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Get relative time (e.g., "2 hours ago") in user's timezone
  getRelativeTime(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    const now = new Date();
    const diffMs = now - localDate;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

    return this.formatDate(localDate);
  }

  // Format month and year
  formatMonthYear(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    return localDate.toLocaleDateString(this.userLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: this.userTimezone
    });
  }

  // Format short month and year
  formatShortMonthYear(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate || isNaN(localDate.getTime())) return '';

    return localDate.toLocaleDateString(this.userLocale, {
      month: 'short',
      year: 'numeric',
      timeZone: this.userTimezone
    });
  }

  // Check if date is today
  isToday(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate) return false;
    
    const today = this.today();
    return localDate.getFullYear() === today.getFullYear() &&
           localDate.getMonth() === today.getMonth() &&
           localDate.getDate() === today.getDate();
  }

  // Check if date is in the past
  isPast(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate) return false;
    return localDate < new Date();
  }

  // Check if date is in the future
  isFuture(date) {
    const localDate = this.toLocalDate(date);
    if (!localDate) return false;
    return localDate > new Date();
  }

  // Parse date string from input (YYYY-MM-DD) and create Date in IST timezone
  parseInputDate(dateString) {
    if (!dateString) return null;
    
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date at noon IST to avoid timezone issues
    // This ensures the date is interpreted in IST, not the browser's timezone
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    
    // Convert to IST representation
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istDate;
  }

  // Get timezone info for display
  getTimezoneInfo() {
    return {
      timezone: this.userTimezone,
      locale: this.userLocale,
      abbreviation: this.getTimezoneAbbreviation(),
      offset: this.getTimezoneOffset()
    };
  }
}

// Create and export singleton instance
const timezoneService = new TimezoneService();

export default timezoneService;

// Also export individual functions for convenience
export const {
  formatDate,
  formatDateTime,
  formatTime,
  formatDateForInput,
  formatDateTimeForInput,
  formatMonthYear,
  formatShortMonthYear,
  getRelativeTime,
  toLocalDate,
  now,
  today,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  isToday,
  isPast,
  isFuture,
  parseInputDate,
  getTimezone,
  getLocale,
  getTimezoneInfo
} = timezoneService;
