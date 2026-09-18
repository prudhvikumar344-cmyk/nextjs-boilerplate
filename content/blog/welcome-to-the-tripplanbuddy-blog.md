---
title: Welcome to the TripPlanBuddy Blog — and how to add a post
date: 2026-09-18
excerpt: This is the first post, and it doubles as the instructions for publishing new ones — no code changes needed.
---

Welcome! This is the first post on the TripPlanBuddy blog. It's here mainly to prove the blog is wired up correctly end to end — but it's also the fastest way to remember how to publish a new one later, so it's written as a quick how-to instead of throwing it away.

## Adding a new post

Every post is a single Markdown file inside `content/blog/`. To publish a new one:

1. In GitHub, go to `content/blog/` and create a new file, for example `content/blog/best-time-to-visit-bali.md`. The filename (without `.md`) becomes the post's URL — that file would live at `/blog/best-time-to-visit-bali`.
2. Start the file with a front-matter block like this one, then the post body underneath:

```
---
title: Best Time to Visit Bali
date: 2026-09-20
excerpt: A short one or two sentence summary shown on the blog listing page.
coverImage: https://example.com/bali.jpg
---

Your post content starts here.
```

3. Commit the file. Vercel redeploys automatically, and the post shows up on `/blog` — newest first — and in the sitemap. Nothing else needs to change.

## What formatting is supported

The post body supports a small, deliberately simple set of Markdown:

- `# `, `## `, `### ` for headings
- Plain paragraphs (just write normally — a blank line starts a new paragraph)
- **Bold** with `**double asterisks**` and *italic* with `*single asterisks*`
- Links: `[TripPlanBuddy](https://tripplanbuddy.com)`
- Images: `![alt text](https://example.com/photo.jpg)`
- Bullet lists with `-` and numbered lists with `1.`
- Quotes with `> like this`
- A horizontal divider with `---`

That covers pretty much everything a travel guide or tips post needs. If something more advanced ever comes up, it's easy to extend.
