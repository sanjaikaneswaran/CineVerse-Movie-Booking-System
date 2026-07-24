/**
 * Resolves image paths stored in MySQL.
 *
 * Recommended database value:
 * /uploads/movies/posters/example.jpg
 *
 * Also accepts:
 * movies/posters/example.jpg
 * uploads/movies/posters/example.jpg
 * https://... (kept for backwards compatibility)
 */
export function resolveImagePath(imagePath, fallback = '/uploads/ui/image-placeholder.svg') {
  const value = String(imagePath || '').trim();

  if (!value) {
    return fallback;
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  if (value.startsWith('/')) {
    return value;
  }

  if (value.startsWith('uploads/')) {
    return `/${value}`;
  }

  return `/uploads/${value}`;
}
