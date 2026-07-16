import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/login`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/signup`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
