/**
 * Extracts the first name from a full name
 * @param fullName - The full name (e.g., "John Doe")
 * @returns The first name (e.g., "John")
 */
export function getFirstName(fullName: string | undefined | null): string {
  if (!fullName) return '';
  
  // If the "name" is actually an email, extract the prefix and format it
  if (fullName.includes('@')) {
    const prefix = fullName.split('@')[0];
    return prefix
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .split(/\s+/)[0] || ''; // return just the first part of the formatted prefix
  }
  
  // Split by space and return the first part
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

/**
 * Gets a display name, preferring first name over full name or email
 * @param displayName - The user's display name
 * @param email - The user's email (fallback)
 * @returns A friendly display name
 */
export function getFriendlyName(displayName: string | undefined | null, email?: string | undefined | null): string {
  if (displayName && displayName !== email) {
    return getFirstName(displayName);
  }
  
  if (email) {
    // Extract name from email (before @)
    const emailName = email.split('@')[0];
    return emailName
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .split(/\s+/)[0] || 'User';
  }
  
  return 'there';
}
