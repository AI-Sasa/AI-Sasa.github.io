/* ==========================================================================
   S.M.U.S. Samarakoon — site behaviour
   Progressive enhancement only: every page reads fine with JS disabled.
   ========================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       Theme — light / dark, remembered per browser
       The initial value is applied by an inline script in <head> to avoid a
       flash; this block only wires up the toggle.
       ---------------------------------------------------------------------- */

    var root = document.documentElement;

    function systemPrefersDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function currentTheme() {
        return root.getAttribute('data-theme') || (systemPrefersDark() ? 'dark' : 'light');
    }

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            /* private mode / blocked storage — the choice just won't persist */
        }
        var toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        }
    }

    var themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        setTheme(currentTheme());
        themeToggle.addEventListener('click', function () {
            setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
        });
    }

    /* ----------------------------------------------------------------------
       Mobile navigation
       ---------------------------------------------------------------------- */

    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('nav-menu');

    function closeMenu() {
        if (!hamburger || !navMenu) return;
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    }

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            var isOpen = navMenu.classList.toggle('active');
            hamburger.classList.toggle('active', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
        });

        navMenu.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });

        document.addEventListener('click', function (e) {
            if (!navMenu.classList.contains('active')) return;
            if (navMenu.contains(e.target) || hamburger.contains(e.target)) return;
            closeMenu();
        });
    }

    /* ----------------------------------------------------------------------
       Navbar hairline once the page has scrolled
       ---------------------------------------------------------------------- */

    var navbar = document.querySelector('.navbar');
    if (navbar) {
        var syncNavbar = function () {
            navbar.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        syncNavbar();
        window.addEventListener('scroll', syncNavbar, { passive: true });
    }

    /* ----------------------------------------------------------------------
       Scroll reveal
       ---------------------------------------------------------------------- */

    var revealTargets = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    /* ----------------------------------------------------------------------
       Smooth in-page anchors (respecting reduced-motion)
       ---------------------------------------------------------------------- */

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var id = this.getAttribute('href');
            if (!id || id === '#') return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            closeMenu();
        });
    });

    /* ----------------------------------------------------------------------
       Contact form — inline status instead of a full page redirect
       ---------------------------------------------------------------------- */

    var contactForm = document.querySelector('.contact-form');

    if (contactForm && window.fetch) {
        var status = document.getElementById('form-status');

        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var button = contactForm.querySelector('button[type="submit"]');
            var original = button ? button.textContent : '';

            if (button) {
                button.disabled = true;
                button.textContent = 'Sending…';
            }
            if (status) {
                status.textContent = '';
                status.style.color = '';
            }

            fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { Accept: 'application/json' }
            })
                .then(function (response) {
                    if (!response.ok) throw new Error('Request failed');
                    contactForm.reset();
                    if (status) {
                        status.textContent = 'Thanks — your message has been sent.';
                        status.style.color = 'var(--accent)';
                    }
                })
                .catch(function () {
                    if (status) {
                        status.textContent = 'Something went wrong. Please email udayangasasanga11@gmail.com directly.';
                        status.style.color = '#d14343';
                    }
                })
                .finally(function () {
                    if (button) {
                        button.disabled = false;
                        button.textContent = original;
                    }
                });
        });
    }

    /* ----------------------------------------------------------------------
       Footer year
       ---------------------------------------------------------------------- */

    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });
})();
