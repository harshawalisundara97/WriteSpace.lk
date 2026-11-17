// Deterministic demo photos for products/banners that have no real image yet —
// stable per id so the same filler shows on every visit. Uses Picsum Photos'
// seeded endpoint (reliable, returns a real photo per seed). Replace by uploading
// real photos in the admin forms, or swap the URL below for your own source.
// Shared by ProductCard, ProductGallery and home ads.

function hash(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Stable demo photo URL for the given id (and optional variant index). */
export function demoImage(id: string, i = 0, size = 800) {
  const seed = hash(`${id}:${i}`, 100000);
  return `https://picsum.photos/seed/ws${seed}/${size}/${size}`;
}
