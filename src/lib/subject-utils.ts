/**
 * Utility functions for subject display and formatting
 */

/**
 * Format a subject name with its syllabus code
 * @param name - The subject name
 * @param code - The syllabus code (e.g., "0610" for Biology)
 * @returns Formatted string like "Biology (0610)" or just "Biology" if no code
 */
export function formatSubjectWithCode(name: string, code?: string | null): string {
  if (!name) return '';
  if (!code) return name;
  return `${name} (${code})`;
}

/**
 * Format a subject for display in dropdowns/selects
 * @param subject - Subject object with name and optional code
 * @returns Formatted display string
 */
export function formatSubjectOption(subject: { name: string; code?: string | null }): string {
  return formatSubjectWithCode(subject.name, subject.code);
}

/**
 * Get the syllabus code display format
 * @param code - The syllabus code
 * @returns Formatted code like "(0610)" or empty string
 */
export function formatSyllabusCode(code?: string | null): string {
  if (!code) return '';
  return `(${code})`;
}
