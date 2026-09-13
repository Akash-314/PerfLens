import { describe, it, expect } from 'vitest';
import {
  isPrivateOrBlockedIPv4,
  isPrivateOrBlockedIPv6,
  parseAlternativeIpFormat,
  validateUrlForSsrf,
  validateUrlSsrfAsync
} from '../services/security/ssrfValidator.js';
import errorHandler from '../middlewares/errorHandler.js';

describe('TASK-019: Security and SSRF Protection', () => {
  describe('SSRF IPv4 Blocking', () => {
    it('blocks loopback addresses (127.0.0.0/8)', () => {
      expect(isPrivateOrBlockedIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIPv4('127.0.0.254')).toBe(true);
      expect(isPrivateOrBlockedIPv4('127.255.255.255')).toBe(true);
    });

    it('blocks private RFC 1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', () => {
      expect(isPrivateOrBlockedIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIPv4('10.255.255.255')).toBe(true);
      expect(isPrivateOrBlockedIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedIPv4('172.31.255.255')).toBe(true);
      expect(isPrivateOrBlockedIPv4('192.168.0.1')).toBe(true);
      expect(isPrivateOrBlockedIPv4('192.168.1.100')).toBe(true);
    });

    it('blocks cloud metadata endpoint (169.254.0.0/16)', () => {
      expect(isPrivateOrBlockedIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIPv4('169.254.1.1')).toBe(true);
    });

    it('blocks current network 0.0.0.0/8 and carrier-grade NAT 100.64.0.0/10', () => {
      expect(isPrivateOrBlockedIPv4('0.0.0.0')).toBe(true);
      expect(isPrivateOrBlockedIPv4('100.64.0.1')).toBe(true);
      expect(isPrivateOrBlockedIPv4('100.127.255.255')).toBe(true);
    });

    it('allows valid public routable IPv4 addresses', () => {
      expect(isPrivateOrBlockedIPv4('8.8.8.8')).toBe(false);
      expect(isPrivateOrBlockedIPv4('1.1.1.1')).toBe(false);
      expect(isPrivateOrBlockedIPv4('142.250.190.46')).toBe(false);
      expect(isPrivateOrBlockedIPv4('104.26.10.228')).toBe(false);
    });
  });

  describe('SSRF IPv6 Blocking', () => {
    it('blocks IPv6 loopback (::1)', () => {
      expect(isPrivateOrBlockedIPv6('::1')).toBe(true);
      expect(isPrivateOrBlockedIPv6('[::1]')).toBe(true);
      expect(isPrivateOrBlockedIPv6('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('blocks IPv6 unique local (fc00::/7)', () => {
      expect(isPrivateOrBlockedIPv6('fc00::1')).toBe(true);
      expect(isPrivateOrBlockedIPv6('fd12:3456:789a::1')).toBe(true);
    });

    it('blocks IPv6 link-local (fe80::/10)', () => {
      expect(isPrivateOrBlockedIPv6('fe80::1')).toBe(true);
      expect(isPrivateOrBlockedIPv6('fe80::dead:beef:1')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 pointing to private addresses', () => {
      expect(isPrivateOrBlockedIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIPv6('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIPv6('::ffff:192.168.1.1')).toBe(true);
    });

    it('allows public IPv6 addresses', () => {
      expect(isPrivateOrBlockedIPv6('2607:f8b0:4005:805::200e')).toBe(false);
      expect(isPrivateOrBlockedIPv6('2001:4860:4860::8888')).toBe(false);
    });
  });

  describe('Alternative IP Representations', () => {
    it('parses integer representations (e.g. 2130706433 -> 127.0.0.1)', () => {
      expect(parseAlternativeIpFormat('2130706433')).toBe('127.0.0.1');
      expect(isPrivateOrBlockedIPv4(parseAlternativeIpFormat('2130706433')!)).toBe(true);
    });

    it('parses hex representations (e.g. 0x7f000001 -> 127.0.0.1)', () => {
      expect(parseAlternativeIpFormat('0x7f000001')).toBe('127.0.0.1');
      expect(isPrivateOrBlockedIPv4(parseAlternativeIpFormat('0x7f000001')!)).toBe(true);
    });
  });

  describe('Static URL SSRF Validation', () => {
    it('rejects harmful protocols (javascript:, file:, data:, gopher:)', () => {
      expect(validateUrlForSsrf('javascript:alert(1)')).toBe(false);
      expect(validateUrlForSsrf('file:///etc/passwd')).toBe(false);
      expect(validateUrlForSsrf('data:text/html,hello')).toBe(false);
      expect(validateUrlForSsrf('gopher://127.0.0.1:6379/')).toBe(false);
    });

    it('rejects localhost and local TLDs', () => {
      expect(validateUrlForSsrf('http://localhost:5001')).toBe(false);
      expect(validateUrlForSsrf('https://app.localhost')).toBe(false);
      expect(validateUrlForSsrf('http://myserver.local')).toBe(false);
      expect(validateUrlForSsrf('http://service.internal')).toBe(false);
      expect(validateUrlForSsrf('http://metadata.google.internal')).toBe(false);
      expect(validateUrlForSsrf('http://instance-data')).toBe(false);
    });

    it('rejects direct private IPs in URLs', () => {
      expect(validateUrlForSsrf('http://127.0.0.1/')).toBe(false);
      expect(validateUrlForSsrf('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(validateUrlForSsrf('http://192.168.1.1:8080/')).toBe(false);
      expect(validateUrlForSsrf('http://10.0.0.5/api')).toBe(false);
      expect(validateUrlForSsrf('http://[::1]:3000/')).toBe(false);
      expect(validateUrlForSsrf('http://2130706433/')).toBe(false);
    });

    it('accepts valid external public URLs', () => {
      expect(validateUrlForSsrf('https://www.google.com')).toBe(true);
      expect(validateUrlForSsrf('https://react.dev')).toBe(true);
      expect(validateUrlForSsrf('https://github.com/facebook/react')).toBe(true);
      expect(validateUrlForSsrf('http://example.com')).toBe(true);
    });
  });

  describe('Async DNS SSRF Validation', () => {
    it('asynchronously detects and blocks localhost', async () => {
      const result = await validateUrlSsrfAsync('http://localhost:5001');
      expect(result.safe).toBe(false);
    });

    it('asynchronously accepts valid public domains', async () => {
      const result = await validateUrlSsrfAsync('https://example.com');
      expect(result.safe).toBe(true);
    });
  });

  describe('Error Handler Production Sanitization', () => {
    it('sanitizes 500 error messages and suppresses stack traces in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReq = {} as any;
      let responseStatus = 0;
      let responseJson: any = null;
      const mockRes = {
        status: (code: number) => {
          responseStatus = code;
          return mockRes;
        },
        json: (data: any) => {
          responseJson = data;
          return mockRes;
        }
      } as any;

      const sensitiveErr = new Error('FATAL: Database connection string postgresql://admin:secretPass@internal:5432/db failed');
      (sensitiveErr as any).statusCode = 500;

      errorHandler(sensitiveErr, mockReq, mockRes, () => {});

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
      expect(responseJson.message).toBe('Internal Server Error. Please contact support.');
      expect(responseJson.stack).toBeUndefined();
      expect(responseJson.message).not.toContain('secretPass');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
