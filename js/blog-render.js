/* ==========================================================================
   Blog rendering

   Builds the listing on blog.html and the article on post.html. Everything
   is constructed as DOM nodes rather than injected HTML strings, so post
   content can never inject markup into the page.
   ========================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       Small helpers
       ---------------------------------------------------------------------- */

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function formatDate(value) {
        if (!value) return '';
        var date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function safeHref(url) {
        return /^(https?:|mailto:|\/|#|[\w./-]+\.html)/i.test(String(url || '')) ? url : null;
    }

    // Order matters: loading/sizes/srcset must all be set before src, or the
    // browser commits to a strategy before it has been told the rules — which
    // leaves a lazy image that never loads. src goes last, always.
    function setImage(img, block, options) {
        var opts = options || {};

        img.alt = block.alt || '';
        img.decoding = 'async';

        // Anything above the fold loads eagerly; lazy loading it only delays
        // the one image the reader is actually waiting for.
        if (opts.eager) {
            img.loading = 'eager';
            img.fetchPriority = 'high';
        } else {
            img.loading = 'lazy';
        }

        if (block.srcset) {
            img.sizes = opts.sizes || '(max-width: 760px) 100vw, 720px';
            img.srcset = block.srcset;
        }

        img.src = block.url;
    }

    /* ----------------------------------------------------------------------
       Inline formatting

       A deliberately tiny subset of markdown: **bold**, *italic*, `code`
       and [text](url). Parsed into real nodes, never innerHTML.
       ---------------------------------------------------------------------- */

    var INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

    function appendInline(parent, text) {
        String(text || '').split(INLINE).forEach(function (part) {
            if (!part) return;

            if (part.slice(0, 2) === '**' && part.slice(-2) === '**') {
                parent.appendChild(el('strong', null, part.slice(2, -2)));
            } else if (part[0] === '*' && part.slice(-1) === '*' && part.length > 2) {
                parent.appendChild(el('em', null, part.slice(1, -1)));
            } else if (part[0] === '`' && part.slice(-1) === '`' && part.length > 2) {
                parent.appendChild(el('code', null, part.slice(1, -1)));
            } else if (part[0] === '[') {
                var match = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
                var href = match && safeHref(match[2]);
                if (href) {
                    var link = el('a', null, match[1]);
                    link.href = href;
                    if (/^https?:/i.test(href)) {
                        link.target = '_blank';
                        link.rel = 'noopener';
                    }
                    parent.appendChild(link);
                } else {
                    parent.appendChild(document.createTextNode(part));
                }
            } else {
                parent.appendChild(document.createTextNode(part));
            }
        });
        return parent;
    }

    /* ----------------------------------------------------------------------
       Block renderers — one per content type
       ---------------------------------------------------------------------- */

    function renderFigure(block, className, options) {
        var figure = el('figure', className || 'article-figure');
        var img = el('img');
        setImage(img, block, options);
        figure.appendChild(img);
        if (block.caption) figure.appendChild(el('figcaption', null, block.caption));
        return figure;
    }

    // Roughly how wide each kind of image actually renders, so the browser can
    // pick a sensibly sized file from the srcset instead of the largest one.
    var SIZES = {
        card: '(max-width: 720px) 100vw, 320px',
        article: '(max-width: 760px) 100vw, 720px',
        gallery: '(max-width: 440px) 100vw, (max-width: 720px) 50vw, 380px'
    };

    var blockRenderers = {
        paragraph: function (block) {
            return appendInline(el('p'), block.text);
        },

        heading: function (block) {
            var level = Math.min(4, Math.max(2, Number(block.level) || 2));
            return appendInline(el('h' + level), block.text);
        },

        image: function (block) {
            return block.url ? renderFigure(block, null, {sizes: SIZES.article}) : null;
        },

        // The grid adapts to however many images the post actually has.
        gallery: function (block) {
            var images = (block.images || []).filter(function (i) { return i && i.url; });
            if (!images.length) return null;
            if (images.length === 1) return renderFigure(images[0], null, {sizes: SIZES.article});

            var wrap = el('div', 'article-gallery');
            wrap.setAttribute('data-count', String(Math.min(images.length, 6)));
            images.forEach(function (image) {
                wrap.appendChild(renderFigure(image, 'article-figure gallery-figure', {sizes: SIZES.gallery}));
            });
            return wrap;
        },

        quote: function (block) {
            var quote = el('blockquote', 'article-quote');
            quote.appendChild(appendInline(el('p'), block.text));
            if (block.cite) quote.appendChild(el('cite', null, block.cite));
            return quote;
        },

        list: function (block) {
            var list = el(block.style === 'number' ? 'ol' : 'ul', 'article-list');
            (block.items || []).forEach(function (item) {
                list.appendChild(appendInline(el('li'), item));
            });
            return list.childNodes.length ? list : null;
        },

        code: function (block) {
            var pre = el('pre', 'article-code');
            var code = el('code', null, block.code || '');
            if (block.language) {
                pre.setAttribute('data-language', block.language);
                code.className = 'language-' + block.language;
            }
            pre.appendChild(code);
            return pre;
        },

        video: function (block) {
            var href = safeHref(block.url);
            if (!href) return null;
            var wrap = el('div', 'article-embed');
            var frame = el('iframe');
            frame.src = href;
            frame.loading = 'lazy';
            frame.title = block.title || 'Embedded video';
            frame.setAttribute('allowfullscreen', '');
            frame.setAttribute('frameborder', '0');
            wrap.appendChild(frame);
            return wrap;
        },

        divider: function () {
            return el('hr', 'article-divider');
        }
    };

    function renderBody(body, target) {
        (body || []).forEach(function (block) {
            var renderer = blockRenderers[block && block.type];
            if (!renderer) return;
            var node = renderer(block);
            if (node) target.appendChild(node);
        });
    }

    /* ----------------------------------------------------------------------
       Shared states
       ---------------------------------------------------------------------- */

    function renderMessage(target, icon, title, message, action) {
        target.innerHTML = '';
        var state = el('div', 'empty-state');
        var iconNode = el('i');
        iconNode.className = icon;
        iconNode.setAttribute('aria-hidden', 'true');
        state.appendChild(iconNode);
        state.appendChild(el('h2', null, title));
        state.appendChild(el('p', null, message));
        if (action) {
            var link = el('a', 'btn btn-outline', action.label);
            link.href = action.href;
            state.appendChild(link);
        }
        target.appendChild(state);
    }

    function renderSkeletons(target, count) {
        target.innerHTML = '';
        var list = el('div', 'post-list');
        for (var i = 0; i < count; i++) {
            var card = el('div', 'post-card is-skeleton');
            card.appendChild(el('div', 'skeleton skeleton-media'));
            var body = el('div', 'post-card-body');
            body.appendChild(el('div', 'skeleton skeleton-line short'));
            body.appendChild(el('div', 'skeleton skeleton-line title'));
            body.appendChild(el('div', 'skeleton skeleton-line'));
            body.appendChild(el('div', 'skeleton skeleton-line'));
            card.appendChild(body);
            list.appendChild(card);
        }
        target.appendChild(list);
    }

    function describeError(error) {
        var provider = window.BlogData ? window.BlogData.provider : 'local';
        var message = (error && error.message) || '';

        // A page opened straight from disk has no origin, so every request it
        // makes is blocked and no CORS entry can ever permit it.
        if (window.location.protocol === 'file:') {
            return 'This page was opened directly from your hard drive (file://), and browsers ' +
                'block pages like that from loading outside content. Serve the folder over HTTP ' +
                'instead — double-click serve.bat, then open http://localhost:4321/blog.html';
        }

        if (provider === 'local') {
            return 'Could not load content/posts.json. Serve the folder over HTTP rather than ' +
                'opening the file directly.';
        }

        // "Failed to fetch" is what a blocked cross-origin request looks like
        // from script, because the browser hides the real response.
        if (/failed to fetch|networkerror|load failed/i.test(message)) {
            return 'The content source could not be reached. If this site\'s address is not listed ' +
                'under CORS origins in your ' + provider + ' project settings, the browser will block ' +
                'the request before it is sent.';
        }

        return message || 'The content source could not be reached.';
    }

    /* ----------------------------------------------------------------------
       Listing page
       ---------------------------------------------------------------------- */

    function buildCard(post, index) {
        var card = el('article', 'post-card');
        if (!post.cover) card.classList.add('post-card--text');

        var href = 'post.html?slug=' + encodeURIComponent(post.slug);

        if (post.cover) {
            var media = el('a', 'post-card-media');
            media.href = href;
            media.setAttribute('tabindex', '-1');
            media.setAttribute('aria-hidden', 'true');
            var img = el('img');
            setImage(img, post.cover, {eager: index === 0, sizes: SIZES.card});
            media.appendChild(img);
            card.appendChild(media);
        }

        var body = el('div', 'post-card-body');

        var meta = el('div', 'post-meta');
        if (post.date) meta.appendChild(el('time', null, formatDate(post.date)));
        meta.appendChild(el('span', null, post.readingMinutes + ' min read'));
        body.appendChild(meta);

        var heading = el('h2', 'post-card-title');
        var link = el('a', null, post.title);
        link.href = href;
        heading.appendChild(link);
        body.appendChild(heading);

        if (post.excerpt) body.appendChild(el('p', 'post-card-excerpt', post.excerpt));

        if (post.tags.length) {
            var tags = el('div', 'work-tags');
            post.tags.forEach(function (tag) {
                tags.appendChild(el('span', 'tag', tag));
            });
            body.appendChild(tags);
        }

        card.appendChild(body);
        return card;
    }

    function renderList(target, posts) {
        target.innerHTML = '';
        var list = el('div', 'post-list');
        posts.forEach(function (post, index) {
            list.appendChild(buildCard(post, index));
        });
        target.appendChild(list);
    }

    function buildFilters(container, posts, onChange) {
        var tags = [];
        posts.forEach(function (post) {
            post.tags.forEach(function (tag) {
                if (tags.indexOf(tag) === -1) tags.push(tag);
            });
        });

        if (tags.length < 2) return;

        var group = el('div', 'blog-filters');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Filter posts by topic');

        ['All'].concat(tags.sort()).forEach(function (tag, index) {
            var chip = el('button', 'chip' + (index === 0 ? ' is-active' : ''), tag);
            chip.type = 'button';
            chip.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
            chip.addEventListener('click', function () {
                group.querySelectorAll('.chip').forEach(function (other) {
                    other.classList.remove('is-active');
                    other.setAttribute('aria-pressed', 'false');
                });
                chip.classList.add('is-active');
                chip.setAttribute('aria-pressed', 'true');
                onChange(index === 0 ? null : tag);
            });
            group.appendChild(chip);
        });

        container.appendChild(group);
    }

    function initListing() {
        var target = document.getElementById('blog-posts');
        if (!target) return;
        var filterHost = document.getElementById('blog-filter-host');

        renderSkeletons(target, 2);

        window.BlogData.getPosts().then(function (posts) {
            if (!posts.length) {
                renderMessage(target, 'fas fa-feather-pointed', 'No posts yet',
                    'This is where I will write about research notes, engineering write-ups and lessons from the lab. First post coming soon.',
                    { label: 'Get notified — say hello', href: 'contact.html' });
                return;
            }

            renderList(target, posts);

            if (filterHost) {
                buildFilters(filterHost, posts, function (tag) {
                    renderList(target, tag
                        ? posts.filter(function (p) { return p.tags.indexOf(tag) !== -1; })
                        : posts);
                });
            }
        }).catch(function (error) {
            renderMessage(target, 'fas fa-triangle-exclamation', 'Posts could not be loaded', describeError(error));
        });
    }

    /* ----------------------------------------------------------------------
       Article page
       ---------------------------------------------------------------------- */

    function setMeta(selector, value) {
        var tag = document.querySelector(selector);
        if (tag) tag.setAttribute('content', value);
    }

    function renderArticle(target, entry) {
        var post = entry.post;

        document.title = post.title + ' — S.M.U.S. Samarakoon';
        setMeta('meta[name="description"]', post.excerpt || post.title);
        setMeta('meta[property="og:title"]', post.title);
        setMeta('meta[property="og:description"]', post.excerpt || post.title);
        if (post.cover) setMeta('meta[property="og:image"]', post.cover.url);

        target.innerHTML = '';

        var article = el('article', 'article');

        var header = el('header', 'article-header');
        var meta = el('div', 'post-meta');
        if (post.date) meta.appendChild(el('time', null, formatDate(post.date)));
        meta.appendChild(el('span', null, post.readingMinutes + ' min read'));
        header.appendChild(meta);
        header.appendChild(el('h1', 'article-title', post.title));
        if (post.excerpt && post.excerptAuthored) {
            header.appendChild(el('p', 'article-standfirst', post.excerpt));
        }

        if (post.tags.length) {
            var tags = el('div', 'work-tags');
            post.tags.forEach(function (tag) { tags.appendChild(el('span', 'tag', tag)); });
            header.appendChild(tags);
        }
        article.appendChild(header);

        if (post.cover) {
            article.appendChild(renderFigure(post.cover, 'article-figure article-cover', {eager: true, sizes: SIZES.article}));
        }

        var body = el('div', 'article-body');
        renderBody(post.body, body);
        article.appendChild(body);

        target.appendChild(article);

        // Previous / next
        if (entry.previous || entry.next) {
            var nav = el('nav', 'article-nav');
            nav.setAttribute('aria-label', 'More posts');

            [['previous', entry.previous, 'Previous'], ['next', entry.next, 'Next']].forEach(function (pair) {
                if (!pair[1]) return;
                var link = el('a', 'article-nav-link article-nav-' + pair[0]);
                link.href = 'post.html?slug=' + encodeURIComponent(pair[1].slug);
                link.appendChild(el('span', 'article-nav-label', pair[2]));
                link.appendChild(el('span', 'article-nav-title', pair[1].title));
                nav.appendChild(link);
            });

            target.appendChild(nav);
        }
    }

    function initArticle() {
        var target = document.getElementById('blog-article');
        if (!target) return;

        var slug = new URLSearchParams(window.location.search).get('slug');

        if (!slug) {
            renderMessage(target, 'fas fa-circle-question', 'No post selected',
                'This page needs a post to show.', { label: 'Back to the blog', href: 'blog.html' });
            return;
        }

        window.BlogData.getPost(slug).then(function (entry) {
            if (!entry) {
                renderMessage(target, 'fas fa-circle-question', 'Post not found',
                    'That article does not exist, or it has not been published yet.',
                    { label: 'Back to the blog', href: 'blog.html' });
                if (window.SiteAnalytics) window.SiteAnalytics.trackMissingArticle(slug);
                return;
            }
            renderArticle(target, entry);
            // Reported here rather than on page load, so the visit is filed
            // under this post's own URL and real title.
            if (window.SiteAnalytics) {
                window.SiteAnalytics.trackArticle(entry.post.slug, entry.post.title);
            }
        }).catch(function (error) {
            renderMessage(target, 'fas fa-triangle-exclamation', 'Post could not be loaded', describeError(error));
        });
    }

    /* ---------------------------------------------------------------------- */

    document.addEventListener('DOMContentLoaded', function () {
        if (!window.BlogData) return;
        initListing();
        initArticle();
    });
})();
