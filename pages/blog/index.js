import Head from "next/head";
import Link from "next/link";
import logoImg from "../../Public/tripplanbuddy-logo.png";
import { getAllPosts } from "../../lib/blog";

export async function getStaticProps() {
  const posts = getAllPosts();
  return { props: { posts } };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndex({ posts }) {
  return (
    <main className="page-root">
      <Head>
        <title>Travel Blog — TripPlanBuddy</title>
        <meta
          name="description"
          content="Destination guides, budgeting tips, and travel-planning advice from TripPlanBuddy — the free AI trip itinerary planner."
        />
        <link rel="canonical" href="https://tripplanbuddy.com/blog" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Travel Blog — TripPlanBuddy" />
        <meta
          property="og:description"
          content="Destination guides, budgeting tips, and travel-planning advice from TripPlanBuddy."
        />
        <meta property="og:url" content="https://tripplanbuddy.com/blog" />
        <meta property="og:site_name" content="TripPlanBuddy" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Travel Blog — TripPlanBuddy" />
        <meta
          name="twitter:description"
          content="Destination guides, budgeting tips, and travel-planning advice from TripPlanBuddy."
        />

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

      <section className="blog-hero">
        <div className="blog-hero__inner">
          <span className="eyebrow">TripPlanBuddy Blog</span>
          <h1 className="blog-hero__title">Travel guides &amp; planning tips</h1>
          <p className="blog-hero__subtitle">
            Destination ideas, budgeting advice, and everything else we learn
            about planning a great trip.
          </p>
        </div>
      </section>

      <section className="post-list">
        <div className="post-list__inner">
          {posts.length === 0 && (
            <p className="empty-state">No posts published yet — check back soon.</p>
          )}

          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="post-card"
            >
              {post.coverImage ? (
                <img
                  src={post.coverImage}
                  alt=""
                  className="post-card__image"
                  loading="lazy"
                />
              ) : (
                <div className="post-card__image post-card__image--placeholder" />
              )}
              <div className="post-card__body">
                <h2 className="post-card__title">{post.title}</h2>
                {post.excerpt && (
                  <p className="post-card__excerpt">{post.excerpt}</p>
                )}
                <div className="post-card__meta">
                  {post.date && <span>{formatDate(post.date)}</span>}
                  {post.date && <span className="dot">·</span>}
                  <span>{post.readingMinutes} min read</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

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

        .blog-hero {
          padding: 56px 20px 32px;
          text-align: center;
        }

        .blog-hero__inner {
          max-width: 720px;
          margin: 0 auto;
        }

        .eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: #4f46e5;
          background: #eef2ff;
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 20px;
        }

        .blog-hero__title {
          font-size: 36px;
          line-height: 1.15;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .blog-hero__subtitle {
          font-size: 17px;
          line-height: 1.6;
          color: #475569;
          margin: 0;
        }

        .post-list {
          padding: 8px 20px 72px;
        }

        .post-list__inner {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .empty-state {
          text-align: center;
          color: #64748b;
          padding: 40px 0;
        }

        .post-card {
          display: flex;
          gap: 20px;
          text-decoration: none;
          color: inherit;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .post-card:hover {
          border-color: #c7d2fe;
          box-shadow: 0 4px 16px rgba(79, 70, 229, 0.08);
        }

        .post-card__image {
          width: 160px;
          height: 110px;
          flex-shrink: 0;
          border-radius: 10px;
          object-fit: cover;
          background: #eef2ff;
        }

        .post-card__image--placeholder {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
        }

        .post-card__body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .post-card__title {
          font-size: 19px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .post-card__excerpt {
          font-size: 14px;
          line-height: 1.55;
          color: #475569;
          margin: 0 0 10px;
        }

        .post-card__meta {
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          opacity: 0.6;
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
          .post-card {
            flex-direction: column;
          }

          .post-card__image {
            width: 100%;
            height: 160px;
          }

          .blog-hero__title {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  );
}
