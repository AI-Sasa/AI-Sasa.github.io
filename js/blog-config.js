/* ==========================================================================
   Blog configuration — the only file you need to edit to switch data source.

   provider: 'local'    → reads content/posts.json (no account, works offline)
             'sanity'   → reads a Sanity.io project (recommended hosted option)
             'supabase' → reads a Supabase Postgres table + storage bucket

   Full setup instructions for each are in BLOG.md.
   ========================================================================== */

window.BLOG_CONFIG = {

    provider: 'sanity',

    /* ---- local: a JSON file committed alongside the site ---- */
    local: {
        url: 'content/posts.json'
    },

    /* ---- Sanity.io ----
       projectId is shown in your Sanity dashboard. No token is needed:
       a public dataset is readable by anyone, which is what we want here.
       Remember to add your site's origin under API → CORS origins.        */
    sanity: {
        projectId: 'pb209bdb',
        dataset: 'production',
        apiVersion: 'v2025-02-19',
        useCdn: true
    },

    /* ---- Supabase ----
       Both values come from Project Settings → API. The anon key is meant
       to be public; row-level security is what keeps writes locked down.  */
    supabase: {
        url: '',
        anonKey: '',
        table: 'posts'
    }
};
