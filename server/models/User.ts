import bcrypt from 'bcryptjs';

export interface IUser {
  _id: string;
  id: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  createdAt?: Date;
  created_at?: string;
}

export interface UserRow {
  id: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
}

/**
 * Compares a plain candidate password against a bcrypt hash.
 */
export const comparePassword = async (
  candidatePassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * Hashes a plain password using bcrypt.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export default {
  comparePassword,
  hashPassword,
};
