import { URL } from 'url';
import dns from 'dns';
import net from 'net';

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * carrier-grade NAT, or otherwise restricted IP range.
 */
export const isPrivateOrBlockedIPv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is blocked
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 (Current network / "this" host)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private-Use RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / Carrier-Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Provider Metadata e.g. AWS/GCP 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private-Use RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (Documentation / TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.168.0.0/16 (Private-Use RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (Documentation / TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (Documentation / TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use / Broadcast: 240.0.0.0 - 255.255.255.255)
  if (a >= 240) return true;

  return false;
};

/**
 * Checks whether an IPv6 address belongs to loopback, link-local, unique local,
 * or mapped IPv4 restricted address.
 */
export const isPrivateOrBlockedIPv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // Loopback (::1 or 0:0:0:0:0:0:0:1)
  if (normalized === '::1' || /^0*(?::0*)*:1$/.test(normalized)) return true;

  // Unspecified (:: or 0:0:0:0:0:0:0:0)
  if (normalized === '::' || /^0*(?::0*)*:0*$/.test(normalized)) return true;

  // Unique local addresses (fc00::/7 -> fc00... or fd00...)
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;

  // Link-local addresses (fe80::/10 -> fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (/^ff[0-9a-f]{2}:/i.test(normalized)) return true;

  // IPv4-mapped IPv6 (::ffff:192.168.1.1 or ::ffff:c0a8:0101)
  if (normalized.includes('::ffff:')) {
    const v4Part = normalized.split('::ffff:')[1];
    if (v4Part.includes('.')) {
      return isPrivateOrBlockedIPv4(v4Part);
    }
    // Hex encoded IPv4
    const hexParts = v4Part.split(':');
    if (hexParts.length === 2) {
      const num1 = parseInt(hexParts[0], 16);
      const num2 = parseInt(hexParts[1], 16);
      if (!isNaN(num1) && !isNaN(num2)) {
        const a = (num1 >> 8) & 0xff;
        const b = num1 & 0xff;
        const c = (num2 >> 8) & 0xff;
        const d = num2 & 0xff;
        return isPrivateOrBlockedIPv4(`${a}.${b}.${c}.${d}`);
      }
    }
    return true; // Malformed mapped address is blocked
  }

  return false;
};

/**
 * Parses integer, octal, or hex host representations into decimal IPv4 if applicable.
 */
export const parseAlternativeIpFormat = (host: string): string | null => {
  const cleanHost = host.trim().toLowerCase();

  // Decimal integer IP (e.g. 2130706433 -> 127.0.0.1)
  if (/^\d+$/.test(cleanHost)) {
    const num = parseInt(cleanHost, 10);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      const a = (num >>> 24) & 0xff;
      const b = (num >>> 16) & 0xff;
      const c = (num >>> 8) & 0xff;
      const d = num & 0xff;
      return `${a}.${b}.${c}.${d}`;
    }
  }

  // Hexadecimal IP (e.g. 0x7f000001 or 0x7f.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(cleanHost)) {
    const num = parseInt(cleanHost, 16);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      const a = (num >>> 24) & 0xff;
      const b = (num >>> 16) & 0xff;
      const c = (num >>> 8) & 0xff;
      const d = num & 0xff;
      return `${a}.${b}.${c}.${d}`;
    }
  }

  return null;
};

/**
 * Synchronous validation against static SSRF attack patterns, harmful schemes,
 * and loopback/private subnets.
 */
export const validateUrlForSsrf = (targetUrl: string): boolean => {
  if (!targetUrl || typeof targetUrl !== 'string') return false;

  const trimmed = targetUrl.trim();
  const urlLower = trimmed.toLowerCase();

  // Enforce http/https schemes only
  if (!/^https?:\/\//i.test(urlLower)) {
    return false;
  }

  // Reject dangerous schemes
  if (
    urlLower.startsWith('javascript:') ||
    urlLower.startsWith('file:') ||
    urlLower.startsWith('data:') ||
    urlLower.startsWith('gopher:') ||
    urlLower.startsWith('ftp:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    // Reject localhost variations
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data'
    ) {
      return false;
    }

    // Check alternative integer/hex IP formats
    const altIp = parseAlternativeIpFormat(hostname);
    if (altIp) {
      if (isPrivateOrBlockedIPv4(altIp)) return false;
    }

    // Check if hostname is direct IPv4
    const ipType = net.isIP(hostname);
    if (ipType === 4) {
      return !isPrivateOrBlockedIPv4(hostname);
    }
    if (ipType === 6) {
      return !isPrivateOrBlockedIPv6(hostname);
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Asynchronously validates the target URL, resolving its hostname via DNS
 * to prevent DNS rebinding or domains mapping to private/internal IP subnets.
 */
export const validateUrlSsrfAsync = async (
  targetUrl: string
): Promise<{ safe: boolean; reason?: string }> => {
  if (!validateUrlForSsrf(targetUrl)) {
    return {
      safe: false,
      reason: 'URL target is prohibited: invalid scheme or targets restricted private/loopback address.'
    };
  }

  try {
    const parsed = new URL(targetUrl.trim());
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

    // If host is already an IP, it passed the static check above
    if (net.isIP(hostname) !== 0) {
      return { safe: true };
    }

    // Resolve hostname via DNS
    const addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, reason: 'Target domain could not be resolved via DNS.' };
    }

    for (const record of addresses) {
      if (record.family === 4) {
        if (isPrivateOrBlockedIPv4(record.address)) {
          return {
            safe: false,
            reason: `Target domain resolves to restricted private/internal IPv4 address: ${record.address}`
          };
        }
      } else if (record.family === 6) {
        if (isPrivateOrBlockedIPv6(record.address)) {
          return {
            safe: false,
            reason: `Target domain resolves to restricted private/internal IPv6 address: ${record.address}`
          };
        }
      }
    }

    return { safe: true };
  } catch (err: any) {
    // If DNS resolution fails (e.g. ENOTFOUND), it cannot access internal network
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      return { safe: false, reason: `Target host cannot be resolved (${err.code}).` };
    }
    return { safe: false, reason: `DNS resolution check failed: ${err.message}` };
  }
};
