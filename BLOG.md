# Blog

The blog reads its posts from a content source. Nothing about an article is hardcoded
in HTML — you write a post once, in one place, and both the listing (`blog.html`) and
the reader (`post.html`) update themselves.

```
js/blog-config.js   the only file you edit to switch source
js/blog-data.js     fetches + normalises (local / Sanity / Supabase)
js/blog-render.js   builds the listing and the article
content/posts.json  offline fallback content
```

**Current setup: Sanity, project `pb209bdb`, dataset `production` (public).**

Articles adapt to their content automatically. Reading time is calculated from the
word count. A post with no cover image renders as a text-only card. An image gallery
lays itself out based on how many images are in it — 1 is full width, 2 sit side by
side, 3 in a row, 4 in a 2x2, and so on.

---

## Writing a post

```bash
cd studio
npm run dev
```

Opens the editor at `http://localhost:3333`. Create a post, click **Generate** next to
the slug, write the body, press **Publish**. Refresh the blog and it is there.

To write from anywhere without a terminal, put the editor online once:

```bash
npm run deploy
```

That gives you `https://<name>.sanity.studio`, free.

### Fill in the excerpt

It is optional, but it is what appears on the listing card and in the preview when
someone shares your link. Left empty, the site falls back to your opening sentence —
which works, but rarely reads like a summary.

---

## Viewing the site — the thing that catches everyone

**Never open the HTML files by double-clicking them.** A page opened that way has a
`file://` address and *no origin*, so the browser blocks it from loading anything
external — your posts included. No CORS setting can fix this, because the origin is
literally `null`; there is nothing to add to the allow-list.

Double-click **`serve.bat`** instead. It serves the folder at `http://localhost:4321`
and opens the blog for you. Leave the window open while you browse; close it to stop.

If you run it by hand, mind both details — the folder you are in, and the bind address:

```bash
cd "H:\New folder\Website" && python -m http.server 4321 --bind 127.0.0.1
```

Run it from the wrong folder and you serve *that* folder instead: you get a 404 for
`blog.html`, and whatever is in that directory becomes readable. Omit
`--bind 127.0.0.1` and Python serves to every device on your network.

Unexplained 404, or "address already in use"? An old server is still holding the port:

```bash
netstat -ano | findstr :4321
```

---

## New addresses need a CORS entry

Sanity only answers browsers from addresses you have listed. Currently allowed:

- `http://localhost:4321` — local preview
- `http://localhost:3333` — the Studio

When you publish the site, add its address too or the blog will show
"Posts could not be loaded":

```bash
cd studio
npx sanity cors add https://yoursite.com --no-credentials
```

`--no-credentials` is the safe choice: anyone may read your published posts, but no
page can act as your logged-in self.

---

## If Sanity is ever unreachable

Set `provider: 'local'` in `js/blog-config.js` and the site serves
`content/posts.json` instead. Worth keeping as a fallback.

---

## Post format

This is the shape every provider is normalised to. You write it directly in
`content/posts.json`; in Sanity the editor produces it for you.

```json
{
  "slug": "url-name-of-the-post",
  "title": "The headline",
  "excerpt": "One or two sentences shown on the listing page.",
  "date": "2026-09-01",
  "tags": ["Research", "Robotics"],
  "cover": { "url": "images/photo.jpg", "alt": "Describe it", "caption": "Optional" },
  "body": [ ... blocks ... ]
}
```

### Blocks

```json
{ "type": "paragraph", "text": "Text with **bold**, *italic*, `code` and [links](https://example.com)." }

{ "type": "heading", "level": 2, "text": "A section heading" }

{ "type": "image", "url": "images/one.jpg", "alt": "Describe it", "caption": "Optional" }

{ "type": "gallery", "images": [
    { "url": "images/a.jpg", "alt": "A", "caption": "" },
    { "url": "images/b.jpg", "alt": "B", "caption": "" }
] }

{ "type": "list", "style": "bullet", "items": ["First", "Second"] }
{ "type": "list", "style": "number", "items": ["First", "Second"] }

{ "type": "quote", "text": "A pulled-out line.", "cite": "Who said it" }

{ "type": "code", "language": "python", "code": "print('hello')" }

{ "type": "video", "url": "https://www.youtube.com/embed/VIDEO_ID" }

{ "type": "divider" }
```

Add as many blocks as you like, in any order — the page grows to fit.

---

## Other databases

Sanity was chosen because it never pauses, needs no card, includes an image CDN, and
gives you a real editor. For reference, the adapters for two alternatives are already
written in `js/blog-data.js`:

- **Supabase** — set `provider: 'supabase'` with your URL and anon key. Free tier
  pauses the project after 7 days without a request, so it needs a keep-alive ping.
- **Firebase** — not wired up. Firestore is free, but Cloud Storage now requires a
  billing account, so images would need a separate host.

---

## Notes

- **Security.** Post content is inserted as text nodes, never as raw HTML, so nothing
  in a post can inject markup into the page. Only `http`, `https` and `mailto` links
  are allowed.
- **The project ID is not a secret.** `pb209bdb` appears in your page source by
  design. It grants read access to already-published posts and nothing else.
- **Search engines.** Articles render in the browser. Google runs JavaScript and will
  index them. If search traffic becomes important, a static build step would serve the
  HTML directly.
- **Caching.** Browsers cache `.js` and `.css` hard. After editing them, Ctrl+F5.
