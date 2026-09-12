# Publishing the website

## Recommendation: GitHub Pages

For this site, with your own domain, GitHub Pages is the best free option.

| | GitHub Pages | Cloudflare Pages | Netlify |
|---|---|---|---|
| Cost | Free, no card | Free, no card | Free, no card |
| Your apex domain (`yoursite.com`) | **A records at your current registrar** | Requires moving nameservers to Cloudflare | A records or their DNS |
| HTTPS | Free, automatic | Free, automatic | Free, automatic |
| Bandwidth | 100 GB/month (soft) | Unlimited | 100 GB/month, costly overages |
| Deploy without git | Upload via web UI | Direct Upload | Drag and drop |

Cloudflare has the better numbers, and a year ago it would have been the pick. Two
things changed that:

1. Cloudflare now steers new projects to **Workers static assets** instead of Pages.
   Pages still works and isn't end-of-lifed, but their own docs call it superseded,
   and new features go to Workers only. That's a moving target you don't need.
2. Using an **apex domain** with Cloudflare means pointing your nameservers at
   Cloudflare — handing them your whole DNS. GitHub Pages just needs four A records
   added wherever your domain already lives.

Your site is 6.5 MB of static files served a few thousand times a month at most.
Unlimited bandwidth solves a problem you do not have. Stability and a simple DNS
change are worth more.

---

## Before you deploy: build a clean folder

**Do not upload the whole Website folder.** The `studio/` folder is the Sanity editor,
not part of the site, and holds hundreds of megabytes of `node_modules`.

Double-click **`publish.bat`**. It creates a `publish/` folder with only what belongs
on a web host:

```
index.html  blog.html  post.html  publication.html  contact.html
css/  js/  images/  content/  .nojekyll  CNAME
```

Upload the **contents** of that folder — not the folder itself.

---

## GitHub Pages, step by step

### 1. Create the repository

On [github.com](https://github.com) → **New repository**.

- Name it `<your-username>.github.io` (using your own account name), or any name you
  like — the domain is what visitors see either way
- Set it **Public**. Free GitHub Pages needs a public repo; private repos require a
  paid plan. Nothing here is secret — the Sanity project ID is public by design and
  grants read-only access to already-published posts.

### 2. Upload the files

Run `publish.bat`, then on the repository page choose **Add file → Upload files**, and
drag in everything *inside* `publish/`. Commit.

(If you prefer git, `git push` the same contents.)

### 3. Turn Pages on

Repository **Settings → Pages** → Source: **Deploy from a branch** → branch `main`,
folder `/ (root)` → **Save**.

A minute later the site is live at `https://<username>.github.io`.

### 4. Point your domain at it

In **Settings → Pages → Custom domain**, type your domain and save. That writes a
`CNAME` file into the repository — keep it, `publish.bat` will preserve it on future
uploads.

Then at your domain registrar, add these DNS records.

For the apex domain (`yoursite.com`) — four A records, all with the same host (`@`):

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

And optionally four AAAA records for IPv6:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

For `www`, one CNAME record:

```
www  →  <your-username>.github.io
```

DNS takes anywhere from a few minutes to a few hours to propagate.

### 5. Force HTTPS

Back in **Settings → Pages**, tick **Enforce HTTPS**. The option can take up to 24
hours to appear while the certificate is issued. Wait for it — don't skip it.

### 6. Tell Sanity about the new address — required

Your blog will show "Posts could not be loaded" until you do this:

```bash
cd studio
npx sanity cors add https://yoursite.com --no-credentials
```

Add `https://www.yoursite.com` too if you use the www version.

---

## Alternative: Netlify, if you would rather not use git

1. Sign up at [netlify.com](https://www.netlify.com)
2. Run `publish.bat`
3. Drag the `publish` folder onto the Netlify dashboard — the site is live immediately
4. **Domain settings → Add custom domain**, then follow their DNS instructions
5. Add the domain to Sanity CORS as above

Simpler to start, but every update means dragging the folder again. GitHub Pages keeps
a history of changes, which you will want eventually.

---

## After any future change

1. Edit the files
2. Run `publish.bat`
3. Upload / commit the contents of `publish/`

Writing a **blog post** needs none of this — posts come from Sanity, so you publish in
the Studio and the live site picks them up on the next page load.
