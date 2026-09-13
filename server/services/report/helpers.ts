/**
 * Validates if the given string ID is a valid identifier (UUID or non-empty string format).
 * @param id String ID to check
 * @returns boolean
 */
export const validateReportId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  // Standard UUID regex or 24-hex mongo-compat fallback
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hex24Regex = /^[0-9a-fA-F]{24}$/;
  return uuidRegex.test(id) || hex24Regex.test(id) || (id.trim().length >= 8 && !id.includes(' '));
};
