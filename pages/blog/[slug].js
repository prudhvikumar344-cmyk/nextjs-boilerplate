import Head from "next/head";
import Link from "next/link";
import logoImg from "../../Public/tripplanbuddy-logo.png";
import { getAllPostSlugs, getPostBySlug } from "../../lib/blog";

export async function getStaticPaths() {
  const slugs = getAllPostSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { notFound: true };
  return { props: { post } };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPost({ post }) {
  const url = `https://tripplanbuddy.com/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url,
    ...(post.coverImage ? { image: post.coverImage } : {}),
    publisher: {
      "@type": "Organization",
      name: "TripPlanBuddy",
    },
  };

  return (
    <main className="page-root">
      <Head>
        <title>{post.title} — TripPlanBuddy Blog</title>
        {post.excerpt && <meta name="description" content={post.excerpt} />}
        <link rel="canonical" href={url} />

        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        {post.excerpt && (
          <meta property="og:description" content={post.excerpt} />
        )}
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="TripPlanBuddy" />
        {post.coverImage && (
          <meta property="og:image" content={post.coverImage} />
        )}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        {post.excerpt && (
          <meta name="twitter:description" content={post.excerpt} />
        )}

        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A7%B3%3C/text%3E%3C/svg%3E"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4F46E5" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="brand">
            <img
              src={logoImg.src || logoImg}
              alt="TripPlanBuddy logo"
              className="brand__logo"
            />
            <span className="brand__name">TripPlanBuddy</span>
          </Link>
          <nav className="site-nav">
            <Link href="/blog" className="site-nav__link site-nav__link--active">
              Blog
            </Link>
            <Link href="/#planner" className="site-nav__cta">
              Plan my trip
            </Link>
          </nav>
        </div>
      </header>

      <article className="post">
        <div className="post__inner">
          <Link href="/blog" className="back-link">
            ← All posts
          </Link>

          <h1 className="post__title">{post.title}</h1>
          <div className="post__meta">
            {post.date && <span>{formatDate(post.date)}</span>}
            {post.date && <span className="dot">·</span>}
            <span>{post.readingMinutes} min read</span>
          </div>

          {post.coverImage && (
            <img
              src={post.coverImage}
              alt=""
              className="post__cover"
            />
          )}

          <div
            className="post__content"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <div className="post__cta">
            <p>Ready to plan your own trip?</p>
            <Link href="/#planner" className="post__cta-button">
              Build my itinerary — it&rsquo;s free
            </Link>
          </div>
        </div>
      </article>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="brand brand--footer">
            <img
              src={logoImg.src || logoImg}
              alt="TripPlanBuddy logo"
              className="brand__logo brand__logo--small"
            />
            <span className="brand__name">TripPlanBuddy</span>
          </div>
          <p className="site-footer__tagline">Free AI-powered travel itineraries.</p>
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} TripPlanBuddy. All rights reserved.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        .post__content p {
          font-size: 17px;
          line-height: 1.75;
          color: #334155;
          margin: 0 0 20px;
        }

        .post__content h1,
        .post__content h2,
        .post__content h3,
        .post__content h4 {
          color: #0f172a;
          font-weight: 700;
          margin: 32px 0 14px;
          letter-spacing: -0.01em;
        }

        .post__content h2 {
          font-size: 24px;
        }

        .post__content h3 {
          font-size: 20px;
        }

        .post__content a {
          color: #4f46e5;
          text-decoration: underline;
        }

        .post__content strong {
          color: #0f172a;
        }

        .post__content ul,
        .post__content ol {
          margin: 0 0 20px;
          padding-left: 22px;
          color: #334155;
          font-size: 17px;
          line-height: 1.75;
        }

        .post__content li {
          margin-bottom: 6px;
        }

        .post__content blockquote {
          margin: 0 0 20px;
          padding: 4px 20px;
          border-left: 3px solid #4f46e5;
          color: #475569;
          font-style: italic;
        }

        .post__content code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .post__content hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 32px 0;
        }

        .post__content img,
        .post-image {
          max-width: 100%;
          border-radius: 12px;
          margin: 12px 0 20px;
        }
      `}</style>

      <style jsx>{`
        .page-root {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 420px);
          color: #0f172a;
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            sans-serif;
        }

        .site-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid #e2e8f0;
        }

        .site-header__inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .brand__logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }

        .brand__logo--small {
          width: 24px;
          height: 24px;
        }

        .brand__name {
          font-weight: 700;
          font-size: 18px;
          color: #0f172a;
        }

        .site-nav {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .site-nav__link {
          font-size: 14px;
          color: #334155;
          text-decoration: none;
          font-weight: 500;
        }

        .site-nav__link:hover,
        .site-nav__link--active {
          color: #4f46e5;
        }

        .site-nav__cta {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #4f46e5;
          padding: 9px 16px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .site-nav__cta:hover {
          background: #4338ca;
        }

        .post {
          padding: 40px 20px 72px;
        }

        .post__inner {
          max-width: 720px;
          margin: 0 auto;
        }

        .back-link {
          display: inline-block;
          font-size: 14px;
          font-weight: 500;
          color: #4f46e5;
          text-decoration: none;
          margin-bottom: 24px;
        }

        .post__title {
          font-size: 34px;
          line-height: 1.2;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .post__meta {
          font-size: 14px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .dot {
          opacity: 0.6;
        }

        .post__cover {
          width: 100%;
          border-radius: 14px;
          margin-bottom: 28px;
        }

        .post__cta {
          margin-top: 48px;
          padding: 28px;
          border-radius: 16px;
          background: #eef2ff;
          text-align: center;
        }

        .post__cta p {
          margin: 0 0 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .post__cta-button {
          display: inline-block;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #4f46e5;
          padding: 11px 22px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .post__cta-button:hover {
          background: #4338ca;
        }

        .site-footer {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 32px 20px;
        }

        .site-footer__inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        }

        .brand--footer {
          margin-bottom: 4px;
        }

        .site-footer__tagline {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .site-footer__copyright {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        @media (max-width: 640px) {
          .post__title {
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}
