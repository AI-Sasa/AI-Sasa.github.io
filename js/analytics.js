/* ==========================================================================
   Analytics — Umami (cookieless, no consent banner required)

   Nothing loads and nothing is sent until you paste a Website ID below, so
   the site is safe to deploy before you have signed up.

   Setup:
     1. Create a free account at https://cloud.umami.is
     2. Add a website, using your live domain
     3. Copy the Website ID it gives you into websiteId below
   ========================================================================== */

(function (global) {
    'use strict';

    var CONFIG = {
        websiteId: '',
        src: 'https://cloud.umami.is/script.js'
    };

    // Article pages get their pageview sent by hand once the post is known,
    // so that each post is recorded under its own readable URL and title
    // instead of every one of them landing on "/post.html".
    var isArticlePage = /(^|\/)post\.html$/i.test(global.location.pathname);

    var queue = [];
    var ready = false;

    function flush() {
        ready = true;
        while (queue.length) {
            var job = queue.shift();
            try {
                global.umami.track(job);
            } catch (e) {
                /* analytics must never break the page */
            }
        }
    }

    function send(payload) {
        if (!CONFIG.websiteId) return;
        if (ready && global.umami && global.umami.track) {
            try {
                global.umami.track(payload);
            } catch (e) { }
            return;
        }
        queue.push(payload);
    }

    global.SiteAnalytics = {
        enabled: Boolean(CONFIG.websiteId),

        // Called by the blog renderer once it knows which post is on screen.
        trackArticle: function (slug, title) {
            send({
                url: '/blog/' + slug,
                title: title,
                referrer: document.referrer
            });
        },

        // A request for a post that does not exist — worth seeing separately,
        // since a spike usually means a broken link somewhere.
        trackMissingArticle: function (slug) {
            send({
                url: '/blog/not-found',
                title: 'Post not found: ' + (slug || '(none)'),
                referrer: document.referrer
            });
        }
    };

    if (!CONFIG.websiteId) return;

    var script = document.createElement('script');
    script.defer = true;
    script.src = CONFIG.src;
    script.setAttribute('data-website-id', CONFIG.websiteId);
    if (isArticlePage) {
        script.setAttribute('data-auto-track', 'false');
    }
    script.addEventListener('load', flush);
    script.addEventListener('error', function () {
        queue.length = 0; // blocked by an ad blocker; give up quietly
    });

    document.head.appendChild(script);
})(window);
