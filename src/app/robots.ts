import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const host = "https://kamikulture.com"; // change to staging if needed
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/checkout/"],
    },
    sitemap: `${host}/sitemap.xml`,
  };
}
