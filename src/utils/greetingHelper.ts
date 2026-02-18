/**
 * Get time-based greeting message
 * Morning: 5:00 - 11:59
 * Afternoon: 12:00 - 16:59
 * Evening: 17:00 - 20:59
 * Night: 21:00 - 4:59
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
};

/**
 * Get emoji based on time of day
 */
export const getGreetingEmoji = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return '☀️'; // Morning sun
  } else if (hour >= 12 && hour < 17) {
    return '🌤️'; // Afternoon
  } else if (hour >= 17 && hour < 21) {
    return '🌆'; // Evening
  } else {
    return '🌙'; // Night
  }
};
