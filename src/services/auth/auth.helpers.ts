/**
 * Helper to construct readable user display names from their email.
 */
export const getUserNameFromEmail = (email: string): string => {
  if (!email) return 'Guest';
  const storedName = localStorage.getItem(`perflens_name_${email}`);
  if (storedName) return storedName;
  
  const prefix = email.split('@')[0];
  return prefix
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Returns initials from a full name or email string.
 */
export const getUserInitials = (name: string): string => {
  if (!name) return 'PL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0][0] || '';
    const last = parts[parts.length - 1][0] || '';
    return (first + last).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
