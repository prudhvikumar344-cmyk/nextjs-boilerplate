import { useState, useRef } from 'react';
import Head from 'next/head';

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState('');
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const bodyRef = useRef(null);

  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, { filename: file.name, dataUrl: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function insertImageTag(img) {
    const slug = slugify(title) || 'post';
    const tag = `![${img.filename}](/blog-images/${slug}/${img.filename})`;
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((b) => `${b}\n\n${tag}\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = body.slice(0, start) + `\n\n${tag}\n\n` + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + tag.length + 4;
      textarea.setSelectionRange(pos, pos);
    });
  }

  function removeImage(filename) {
    setImages((prev) => prev.filter((img) => img.filename !== filename));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!password) {
      setStatus({ type: 'error', message: 'Enter the admin password.' });
      return;
    }
    if (!title.trim() || !body.trim()) {
      setStatus({ type: 'error', message: 'Title and body are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          title,
          excerpt,
          date,
          body,
          images: images.map((img) => ({ filename: img.filename, dataUrl: img.dataUrl })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Something went wrong.' });
      } else {
        setStatus({ type: 'ok', message: `Published! It will be live at ${data.url} in a minute or two, once Vercel finishes building.` });
        setTitle('');
        setExcerpt('');
        setBody('');
        setImages([]);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error, please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>New blog post admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="wrap">
        <h1>Write a new blog post</h1>
        <p className="hint">This saves straight into your GitHub repo. Vercel rebuilds automatically after you publish.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Admin password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          </label>

          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A Weekend in Goa" />
          </label>

          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label>
            Short excerpt, this shows on the blog list
            <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="One or two sentences that sum up the post" />
          </label>

          <label>
            Photos
            <input type="file" accept="image/*" multiple onChange={handleImageSelect} />
          </label>

          {images.length > 0 && (
            <div className="thumbs">
              {images.map((img) => (
                <div className="thumb" key={img.filename}>
                  <img src={img.dataUrl} alt={img.filename} />
                  <span>{img.filename}</span>
                  <div className="thumbActions">
                    <button type="button" onClick={() => insertImageTag(img)}>Insert into post</button>
                    <button type="button" className="remove" onClick={() => removeImage(img.filename)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label>
            Post text, Markdown supported, use two hash marks for a heading
            <textarea rows={16} ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your post here. Upload photos above, then click Insert into post to drop them in wherever your cursor is." />
          </label>

          <button type="submit" disabled={submitting} className="submit">
            {submitting ? 'Publishing...' : 'Publish post'}
          </button>

          {status && <p className={status.type === 'ok' ? 'ok' : 'error'}>{status.message}</p>}
        </form>
      </div>
      <style jsx>{`
        .wrap { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; font-family: -apple-system, Inter, sans-serif; color: #1f2937; }
        h1 { font-size: 28px; margin-bottom: 4px; }
        .hint { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
        form { display: flex; flex-direction: column; gap: 18px; }
        label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: #374151; }
        input[type="text"], input[type="password"], input[type="date"], textarea {
          font: inherit; font-weight: 400; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical;
        }
        input:focus, textarea:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.15); }
        .thumbs { display: flex; flex-wrap: wrap; gap: 12px; }
        .thumb { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; width: 140px; font-size: 12px; }
        .thumb img { width: 100%; height: 90px; object-fit: cover; border-radius: 6px; }
        .thumb span { display: block; margin: 6px 0; word-break: break-all; color: #6b7280; }
        .thumbActions { display: flex; flex-direction: column; gap: 4px; }
        .thumbActions button { font-size: 12px; padding: 4px 6px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; }
        .thumbActions .remove { color: #b91c1c; border-color: #fecaca; }
        .submit { align-self: flex-start; background: #4f46e5; color: white; border: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ok { color: #047857; font-size: 14px; }
        .error { color: #b91c1c; font-size: 14px; }
      `}</style>
    </>
  );
}
