import { Recommendation } from './types.js';

/**
 * Computes an overall health score (0-100) based on active issues.
 * @param recommendations Array of parsed recommendations
 * @returns Health score (0-100)
 */
export const calculateHealthScore = (recommendations: Recommendation[]): number => {
  let criticalDeduction = 0;
  let highDeduction = 0;
  let mediumDeduction = 0;
  let lowDeduction = 0;

  recommendations.forEach(rec => {
    switch (rec.priority) {
      case 'critical':
        criticalDeduction += 15;
        break;
      case 'high':
        highDeduction += 10;
        break;
      case 'medium':
        mediumDeduction += 5;
        break;
      case 'low':
        lowDeduction += 1;
        break;
    }
  });

  // Cap deductions to avoid skewing the score to zero too quickly
  criticalDeduction = Math.min(criticalDeduction, 40);
  highDeduction = Math.min(highDeduction, 30);
  mediumDeduction = Math.min(mediumDeduction, 20);
  lowDeduction = Math.min(lowDeduction, 10);

  const totalDeductions = criticalDeduction + highDeduction + mediumDeduction + lowDeduction;
  return Math.max(0, 100 - totalDeductions);
};

/**
 * Maps a numeric score (0-100) to a letter grade (A-F).
 * @param score Health score
 * @returns Letter grade
 */
export const getPerformanceGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
};

/**
 * Formats a sum of implementation hours into a readable developer summary string.
 * @param totalHours Sum of hours of all tasks
 * @returns e.g. "30 mins", "5.5 hours", "1.4 days"
 */
export const formatTimeEstimate = (totalHours: number): string => {
  if (totalHours === 0) return '0 mins';
  
  if (totalHours < 1) {
    const mins = Math.round(totalHours * 60);
    return `${mins} mins`;
  }
  
  if (totalHours < 8) {
    return `${totalHours.toFixed(1)} hours`;
  }

  const days = totalHours / 8; // assuming 8-hour workday
  return `${days.toFixed(1)} day${days > 1 ? 's' : ''}`;
};
