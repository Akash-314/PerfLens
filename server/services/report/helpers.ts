import mongoose from 'mongoose';

/**
 * Validates if the given string ID is a valid MongoDB ObjectId.
 * @param id String ID to check
 * @returns boolean
 */
export const validateReportId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};
