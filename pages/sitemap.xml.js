import { getAllPosts } from "../lib/blog";

const SITE_URL = "https://tripplanbuddy.com";

// A dynamic sitemap so new blog posts show up for search engines
// automatically on the next deploy, with no separate file to remember to
// update by hand (the old /public/sitemap.xml was static and had to be
// edited manually every time).
function generateSitemap(posts) {
  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/blog`, changefreq: "weekly", priority: "0.8" },
  ];

  const postUrls = posts.map((post) => ({
    loc: `${SITE_URL}/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.6",
    lastmod: post.date || undefined,
  }));

  const urls = [...staticUrls, ...postUrls];

  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "";
      return `<url><loc>${u.loc}</loc>${lastmod}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function getServerSideProps({ res }) {
  const posts = getAllPosts();
  const xml = generateSitemap(posts);
  res.setHeader("Content-Type", "text/xml");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
