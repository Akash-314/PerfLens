import { body } from 'express-validator';
import { validateUrlForSsrf, validateUrlSsrfAsync } from '../services/security/ssrfValidator.js';

export const scanValidator = [
  body('url')
    .notEmpty()
    .withMessage('URL target is required')
    .trim()
    .custom(async (value: string) => {
      const urlToValidate = /^https?:\/\//i.test(value) ? value : 'https://' + value;

      // 1. Static structural and scheme SSRF checks
      if (!validateUrlForSsrf(urlToValidate)) {
        throw new Error('Scanning private IP addresses, loopback links, cloud metadata, or unsafe schemes is prohibited');
      }

      // 2. Asynchronous DNS resolution check (blocks DNS rebinding and internal host resolution)
      const ssrfCheck = await validateUrlSsrfAsync(urlToValidate);
      if (!ssrfCheck.safe) {
        throw new Error(ssrfCheck.reason || 'Restricted target host rejected for security reasons');
      }

      return true;
    })
];
