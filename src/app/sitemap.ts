import type { MetadataRoute } from "next";
import { products } from "@/data/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kamikulture.com"; // or your staging URL
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/products`, lastModified: now },
    { url: `${base}/privacy`, lastModified: now },
    { url: `${base}/thank-you`, lastModified: now },
  ];

  const productPages = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: now,
  }));

  return [...staticPages, ...productPages];
}
