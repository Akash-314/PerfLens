import { body } from 'express-validator';
import { URL } from 'url';

export const scanValidator = [
  body('url')
    .notEmpty()
    .withMessage('URL target is required')
    .trim()
    .custom((value: string) => {
      const urlLower = value.toLowerCase();

      // Reject protocols like javascript: or file://
      if (urlLower.startsWith('javascript:') || /javascript:/i.test(urlLower)) {
        throw new Error('JavaScript URIs are not allowed');
      }
      if (urlLower.startsWith('file:') || /file:/i.test(urlLower)) {
        throw new Error('Local file URIs are not allowed');
      }

      // Extract hostname
      let host = value;
      try {
        const urlToParse = /^https?:\/\//i.test(value) ? value : 'https://' + value;
        const parsed = new URL(urlToParse);
        host = parsed.hostname;
      } catch (err) {
        throw new Error('Please provide a valid website URL structure');
      }

      const hostLower = host.toLowerCase();

      // Reject localhost
      if (hostLower === 'localhost' || hostLower.endsWith('.localhost')) {
        throw new Error('Localhost scanning is not allowed for security reasons');
      }

      // Reject loopbacks & private subnets (IPv4 and IPv6)
      const ipPattern = /^(?:127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/;
      if (ipPattern.test(hostLower) || hostLower === '::1' || hostLower === '[::1]' || hostLower === '0.0.0.0') {
        throw new Error('Scanning private IP addresses or loopback links is prohibited');
      }

      return true;
    })
];
