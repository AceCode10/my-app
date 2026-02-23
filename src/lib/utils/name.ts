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
  // If we have a proper display name (not the email, and contains a space = real name)
  if (displayName && displayName !== email && !displayName.includes('@')) {
    // If the display name has spaces, it's a real name like "Copper Jet" → use first name
    if (displayName.includes(' ')) {
      return getFirstName(displayName);
    }
    // Single word name — could be a real first name or a username like "Copperjetofficial"
    // If it's longer than 12 chars or all lowercase with no clear word boundary, try email instead
    if (email && displayName.length > 12 && displayName === displayName.toLowerCase()) {
      const emailName = email.split('@')[0];
      const formatted = emailName
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .split(/\s+/)[0] || displayName;
      // Only use email-derived name if it's different and shorter
      if (formatted.length < displayName.length) {
        return formatted;
      }
    }
    return displayName;
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
