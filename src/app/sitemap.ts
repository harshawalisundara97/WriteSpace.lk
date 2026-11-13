import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/catalog/queries";
import { getBundleSlugs } from "@/lib/catalog/bundles";

export const revalidate = 3600;

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, categories }, bundleSlugs] = await Promise.all([getSitemapEntries(), getBundleSlugs()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/promotions`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/bundles`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/c/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/products/${p.slug}`,
    lastModified: p.lastModified ? new Date(p.lastModified) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const bundleRoutes: MetadataRoute.Sitemap = bundleSlugs.map((slug) => ({
    url: `${BASE}/bundles/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...bundleRoutes];
}
