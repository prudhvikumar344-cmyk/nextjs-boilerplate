export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeYaml(value) {
  return String(value || '').replace(/"/g, '\\"');
}

async function githubRequest(path, options) {
  const url = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options && options.headers),
    },
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
    res.status(500).json({
      error: 'Admin publishing is not configured yet. Set ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in your Vercel project settings.',
    });
    return;
  }

  const { password, title, excerpt, date, body, images } = req.body || {};

  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password.' });
    return;
  }

  if (!title || !title.trim() || !body || !body.trim()) {
    res.status(400).json({ error: 'Title and post text are required.' });
    return;
  }

  const slug = slugify(title);
  if (!slug) {
    res.status(400).json({ error: 'Could not turn that title into a URL slug, try a title with some letters or numbers.' });
    return;
  }

  const branch = process.env.GITHUB_BRANCH || 'main';
  const postDate = date || new Date().toISOString().slice(0, 10);
  const frontmatter = `---\ntitle: "${escapeYaml(title.trim())}"\ndate: ${postDate}\nexcerpt: "${escapeYaml(excerpt ? excerpt.trim() : '')}"\n---\n\n`;
  const markdown = frontmatter + body.trim() + '\n';

  const postPath = `content/blog/${slug}.md`;
  const postRes = await githubRequest(postPath, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Add blog post: ${title.trim()}`,
      content: Buffer.from(markdown, 'utf-8').toString('base64'),
      branch,
    }),
  });

  if (!postRes.ok) {
    const errBody = await postRes.json().catch(() => ({}));
    if (postRes.status === 422) {
      res.status(409).json({ error: 'A post with that exact title already exists. Try a slightly different title.' });
    } else {
      res.status(502).json({ error: `GitHub rejected the post: ${errBody.message || postRes.statusText}` });
    }
    return;
  }

  const uploadedImages = [];
  for (const img of images || []) {
    if (!img || !img.filename || !img.dataUrl) continue;
    const base64 = String(img.dataUrl).split(',')[1];
    if (!base64) continue;
    const safeName = img.filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const imgPath = `public/blog-images/${slug}/${safeName}`;
    const imgRes = await githubRequest(imgPath, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Add image for ${title.trim()}: ${safeName}`,
        content: base64,
        branch,
      }),
    });
    if (imgRes.ok) {
      uploadedImages.push(safeName);
    }
  }

  res.status(200).json({
    ok: true,
    slug,
    url: `/blog/${slug}`,
    imagesUploaded: uploadedImages.length,
    imagesRequested: (images || []).length,
  });
}
