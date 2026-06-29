/**
 * Extracts width, height, and aspect ratio from image URLs (e.g. from CDN parameters or filename patterns).
 * @param url Image URL
 * @returns Object containing width, height, and aspect ratio or nulls
 */
export const parseDimensionsFromUrl = (
  url: string
): { width: number | null; height: number | null; aspectRatio: number | null } => {
  let width: number | null = null;
  let height: number | null = null;

  try {
    const parsed = new URL(url);

    // 1. Try common query params (w, width, h, height)
    const wVal = parsed.searchParams.get('width') || parsed.searchParams.get('w');
    const hVal = parsed.searchParams.get('height') || parsed.searchParams.get('h');

    if (wVal && !isNaN(parseInt(wVal, 10))) {
      width = parseInt(wVal, 10);
    }
    if (hVal && !isNaN(parseInt(hVal, 10))) {
      height = parseInt(hVal, 10);
    }

    const path = parsed.pathname;

    // 2. Try URL segments for dimensions (e.g., picsum.photos/200/300 or /id/237/200/300)
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length >= 2) {
      const last = pathSegments[pathSegments.length - 1];
      const secondLast = pathSegments[pathSegments.length - 2];
      if (/^\d+$/.test(last) && /^\d+$/.test(secondLast)) {
        if (!width) width = parseInt(secondLast, 10);
        if (!height) height = parseInt(last, 10);
      }
    }

    // 3. Try filename patterns like filename-800x600.png or filename_800x600.jpg
    const filename = pathSegments[pathSegments.length - 1] || '';
    const sizeMatch = filename.match(/[-_]?(\d+)x(\d+)(?:\.|$)/i);
    if (sizeMatch) {
      if (!width) width = parseInt(sizeMatch[1], 10);
      if (!height) height = parseInt(sizeMatch[2], 10);
    }
  } catch (_) {
    // Fallback regex matching on the raw URL string
    const sizeMatch = url.match(/[-_/](\d+)x(\d+)(?:\.|$)/i);
    if (sizeMatch) {
      width = parseInt(sizeMatch[1], 10);
      height = parseInt(sizeMatch[2], 10);
    }
  }

  const aspectRatio = width && height && height > 0 ? parseFloat((width / height).toFixed(2)) : null;

  return { width, height, aspectRatio };
};

/**
 * Extracts format extension from URL or Content-Type headers
 * @param url Image URL
 * @param contentType Response content-type header
 * @returns Clean format extension name
 */
export const extractExtension = (url: string, contentType: string): string => {
  try {
    const parsed = new URL(url);
    const filename = parsed.pathname.split('/').pop() || '';
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex !== -1) {
      const ext = filename.substring(dotIndex + 1).toLowerCase();
      if (/^[a-z0-9]{2,5}$/.test(ext)) {
        return ext;
      }
    }
  } catch (_) {
    // Fallback to Content-Type parsing
  }

  const mime = contentType.toLowerCase().trim();
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('avif')) return 'avif';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('tiff')) return 'tiff';
  if (mime.includes('bmp')) return 'bmp';

  return 'unknown';
};

/**
 * Estimates size of image if converted to WebP format
 * @param extension Image extension
 * @param sizeKb File size in KB
 * @returns Potential size and savings in KB
 */
export const estimateWebpSavings = (
  extension: string,
  sizeKb: number
): { potentialSizeKb: number; savingsKb: number } => {
  const ext = extension.toLowerCase();
  if (ext === 'webp' || ext === 'avif' || ext === 'svg') {
    return { potentialSizeKb: sizeKb, savingsKb: 0 };
  }
  // Standard WebP optimization achieves ~30% file size reduction
  const potentialSizeKb = parseFloat((sizeKb * 0.7).toFixed(1));
  const savingsKb = parseFloat(Math.max(0, sizeKb - potentialSizeKb).toFixed(1));
  return { potentialSizeKb, savingsKb };
};

/**
 * Estimates size of image if converted to AVIF format
 * @param extension Image extension
 * @param sizeKb File size in KB
 * @returns Potential size and savings in KB
 */
export const estimateAvifSavings = (
  extension: string,
  sizeKb: number
): { potentialSizeKb: number; savingsKb: number } => {
  const ext = extension.toLowerCase();
  if (ext === 'avif' || ext === 'svg') {
    return { potentialSizeKb: sizeKb, savingsKb: 0 };
  }
  // AVIF yields ~50% savings over JPEG/PNG, or ~30% savings over WebP
  let factor = 0.5;
  if (ext === 'webp') {
    factor = 0.7;
  }
  const potentialSizeKb = parseFloat((sizeKb * factor).toFixed(1));
  const savingsKb = parseFloat(Math.max(0, sizeKb - potentialSizeKb).toFixed(1));
  return { potentialSizeKb, savingsKb };
};
