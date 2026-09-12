/* ==========================================================================
   Blog data layer

   Every provider is normalised to one post shape, so the renderer never
   needs to know where the content came from:

   {
     slug, title, excerpt, date, tags[], readingMinutes,
     cover: { url, alt, caption, srcset } | null,
     body: [ block, ... ]
   }

   Block types: heading | paragraph | image | gallery | quote | list | code
                | video | divider
   ========================================================================== */

(function (global) {
    'use strict';

    var config = global.BLOG_CONFIG || { provider: 'local', local: { url: 'content/posts.json' } };

    /* ----------------------------------------------------------------------
       Helpers
       ---------------------------------------------------------------------- */

    function words(text) {
        return String(text || '').trim().split(/\s+/).filter(Boolean).length;
    }

    function readingMinutes(post) {
        var count = words(post.excerpt);
        (post.body || []).forEach(function (block) {
            if (block.text) count += words(block.text);
            if (block.items) count += words(block.items.join(' '));
            if (block.code) count += words(block.code);
        });
        return Math.max(1, Math.round(count / 200));
    }

    function firstParagraph(body) {
        var block = (body || []).filter(function (b) { return b.type === 'paragraph'; })[0];
        if (!block) return '';
        var text = String(block.text || '').replace(/[*`_]/g, '');
        return text.length > 180 ? text.slice(0, 177).trimEnd() + '…' : text;
    }

    function normalisePost(post) {
        var body = Array.isArray(post.body) ? post.body : [];
        var normalised = {
            slug: post.slug,
            title: post.title || 'Untitled',
            // A written excerpt is a summary; a derived one is just the opening
            // line, so the article page skips it rather than printing it twice.
            excerptAuthored: Boolean(post.excerpt && String(post.excerpt).trim()),
            excerpt: post.excerpt || firstParagraph(body),
            date: post.date || null,
            tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
            cover: post.cover && post.cover.url ? post.cover : null,
            body: body
        };
        normalised.readingMinutes = readingMinutes(normalised);
        return normalised;
    }

    function byNewest(a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
    }

    function finalise(posts) {
        return posts
            .filter(function (p) { return p && p.slug; })
            .map(normalisePost)
            .sort(byNewest);
    }

    function fetchJson(url, options) {
        return fetch(url, options).then(function (res) {
            if (!res.ok) throw new Error('Request failed (' + res.status + ')');
            return res.json();
        });
    }

    /* ----------------------------------------------------------------------
       Provider: local JSON file
       ---------------------------------------------------------------------- */

    function loadLocal() {
        var url = (config.local && config.local.url) || 'content/posts.json';
        return fetchJson(url).then(function (data) {
            return finalise(Array.isArray(data) ? data : (data.posts || []));
        });
    }

    /* ----------------------------------------------------------------------
       Provider: Sanity.io

       Sanity stores rich text as Portable Text, so the body is converted
       into our own block list below.
       ---------------------------------------------------------------------- */

    var SANITY_QUERY =
        '*[_type == "post" && defined(slug.current)] | order(publishedAt desc){' +
        '"slug": slug.current,' +
        'title,' +
        'excerpt,' +
        '"date": publishedAt,' +
        'tags,' +
        '"cover": {' +
        '"url": coverImage.asset->url,' +
        '"alt": coverImage.alt,' +
        '"caption": coverImage.caption' +
        '},' +
        '"body": body[]{' +
        '...,' +
        '_type == "image" => { "url": asset->url, alt, caption },' +
        '_type == "gallery" => { "images": images[]{ "url": asset->url, alt, caption } }' +
        '}' +
        '}';

    // Sanity's image CDN resizes on the fly, so we can hand the browser a
    // proper srcset instead of shipping one oversized original.
    function sanityImage(url, width) {
        if (!url) return url;
        return url + (url.indexOf('?') === -1 ? '?' : '&') + 'w=' + width + '&auto=format&fit=max';
    }

    function sanitySrcset(url) {
        if (!url || url.indexOf('cdn.sanity.io') === -1) return null;
        return [480, 768, 1200, 1800].map(function (w) {
            return sanityImage(url, w) + ' ' + w + 'w';
        }).join(', ');
    }

    function sanityAsset(img) {
        if (!img || !img.url) return null;
        return {
            url: sanityImage(img.url, 1200) || img.url,
            srcset: sanitySrcset(img.url),
            alt: img.alt || '',
            caption: img.caption || ''
        };
    }

    // Portable Text spans carry marks (strong / em / links). We flatten them
    // back into the lightweight inline syntax the renderer already parses.
    function spansToText(block) {
        var linkDefs = {};
        (block.markDefs || []).forEach(function (def) { linkDefs[def._key] = def; });

        return (block.children || []).map(function (span) {
            var text = span.text || '';
            (span.marks || []).forEach(function (mark) {
                var def = linkDefs[mark];
                if (def && def._type === 'link' && def.href) {
                    text = '[' + text + '](' + def.href + ')';
                } else if (mark === 'strong') {
                    text = '**' + text + '**';
                } else if (mark === 'em') {
                    text = '*' + text + '*';
                } else if (mark === 'code') {
                    text = '`' + text + '`';
                }
            });
            return text;
        }).join('');
    }

    function portableTextToBlocks(body) {
        var blocks = [];
        var list = null;

        function flushList() {
            if (list && list.items.length) blocks.push(list);
            list = null;
        }

        (body || []).forEach(function (node) {
            if (!node || !node._type) return;

            if (node._type === 'image') {
                flushList();
                var image = sanityAsset(node);
                if (image) blocks.push({ type: 'image', url: image.url, srcset: image.srcset, alt: image.alt, caption: image.caption });
                return;
            }

            if (node._type === 'gallery') {
                flushList();
                var images = (node.images || []).map(sanityAsset).filter(Boolean);
                if (images.length) blocks.push({ type: 'gallery', images: images });
                return;
            }

            if (node._type === 'code') {
                flushList();
                blocks.push({ type: 'code', language: node.language || '', code: node.code || '' });
                return;
            }

            if (node._type === 'video' || node._type === 'embed') {
                flushList();
                if (node.url) blocks.push({ type: 'video', url: node.url });
                return;
            }

            if (node._type !== 'block') return;

            var text = spansToText(node);
            if (!text.trim()) return;

            if (node.listItem) {
                var style = node.listItem === 'number' ? 'number' : 'bullet';
                if (!list || list.style !== style) {
                    flushList();
                    list = { type: 'list', style: style, items: [] };
                }
                list.items.push(text);
                return;
            }

            flushList();

            if (node.style === 'blockquote') {
                blocks.push({ type: 'quote', text: text, cite: '' });
            } else if (/^h[2-4]$/.test(node.style || '')) {
                blocks.push({ type: 'heading', level: Number(node.style.slice(1)), text: text });
            } else {
                blocks.push({ type: 'paragraph', text: text });
            }
        });

        flushList();
        return blocks;
    }

    function loadSanity() {
        var settings = config.sanity || {};
        if (!settings.projectId) {
            return Promise.reject(new Error('Sanity projectId is not set in js/blog-config.js'));
        }

        var host = settings.useCdn === false ? 'api.sanity.io' : 'apicdn.sanity.io';
        var url = 'https://' + settings.projectId + '.' + host +
            '/' + (settings.apiVersion || 'v2025-02-19') +
            '/data/query/' + (settings.dataset || 'production') +
            '?perspective=published&query=' + encodeURIComponent(SANITY_QUERY);

        return fetchJson(url).then(function (payload) {
            return finalise((payload.result || []).map(function (post) {
                var cover = sanityAsset(post.cover);
                return {
                    slug: post.slug,
                    title: post.title,
                    excerpt: post.excerpt,
                    date: post.date ? String(post.date).slice(0, 10) : null,
                    tags: post.tags,
                    cover: cover,
                    body: portableTextToBlocks(post.body)
                };
            }));
        });
    }

    /* ----------------------------------------------------------------------
       Provider: Supabase

       One row per post; the body column is jsonb holding our block array.
       Read access comes from a row-level-security policy, so the anon key
       in the config grants nothing but SELECT on published rows.
       ---------------------------------------------------------------------- */

    function loadSupabase() {
        var settings = config.supabase || {};
        if (!settings.url || !settings.anonKey) {
            return Promise.reject(new Error('Supabase url and anonKey are not set in js/blog-config.js'));
        }

        var endpoint = settings.url.replace(/\/$/, '') +
            '/rest/v1/' + (settings.table || 'posts') +
            '?select=slug,title,excerpt,date,tags,cover,body&published=eq.true&order=date.desc';

        return fetchJson(endpoint, {
            headers: {
                apikey: settings.anonKey,
                Authorization: 'Bearer ' + settings.anonKey
            }
        }).then(function (rows) {
            return finalise((rows || []).map(function (row) {
                return {
                    slug: row.slug,
                    title: row.title,
                    excerpt: row.excerpt,
                    date: row.date ? String(row.date).slice(0, 10) : null,
                    tags: row.tags,
                    cover: row.cover,
                    body: row.body
                };
            }));
        });
    }

    /* ----------------------------------------------------------------------
       Public surface
       ---------------------------------------------------------------------- */

    var providers = {
        local: loadLocal,
        sanity: loadSanity,
        supabase: loadSupabase
    };

    var cache = null;

    function getPosts() {
        if (cache) return cache;
        var load = providers[config.provider] || providers.local;
        cache = load().catch(function (error) {
            cache = null;
            throw error;
        });
        return cache;
    }

    function getPost(slug) {
        return getPosts().then(function (posts) {
            var index = posts.findIndex(function (p) { return p.slug === slug; });
            if (index === -1) return null;
            return {
                post: posts[index],
                previous: posts[index + 1] || null,
                next: posts[index - 1] || null
            };
        });
    }

    global.BlogData = {
        getPosts: getPosts,
        getPost: getPost,
        provider: config.provider
    };
})(window);
