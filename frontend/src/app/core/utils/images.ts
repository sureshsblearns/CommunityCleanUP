/**
 * Returns a resized variant of an image URL. Cloudinary URLs get an on-the-fly transformation,
 * Unsplash demo URLs get width parameters; other URLs are returned unchanged.
 */
export function thumbnail(url: string | null | undefined, width = 480, height = 320): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/c_fill,w_${width},h_${height},q_auto,f_auto/`);
  }
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?w=${width}&h=${height}&fit=crop&q=70&auto=format`;
  }
  return url;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
