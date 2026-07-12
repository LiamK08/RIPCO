/* RipCo early access. Loaded on account.html only.

   ============================ SUPABASE CONFIG ============================
   Fill these two values from your Supabase project (Settings > API) to
   switch early-access signups on. While they are empty, the page shows an
   honest "early access isn't open yet" state. It never fakes a signup,
   a success message or a signed-in session.

   The official client is served from this site's own origin
   (assets/vendor/supabase/supabase.js, pinned version in VERSION.txt
   alongside it) and is only loaded once real keys are present, so the
   page works fully offline while unconfigured.

   The anon public key is designed to be visible in client code. Never put
   the service_role key here.
   ========================================================================= */

(function () {
  'use strict';

  var SUPABASE_URL = '';      // e.g. 'https://yourproject.supabase.co'
  var SUPABASE_ANON_KEY = ''; // the anon public key, not the service key

  /* ======================================================================= */

  var configured = SUPABASE_URL.indexOf('https://') === 0 && SUPABASE_ANON_KEY.length > 20;

  /* Abuse limits: a form submitted faster than a person can type an email,
     or with the hidden decoy field filled in, is treated as automation.
     Repeat submissions are spaced out client-side. */
  var MIN_FORM_MS = 2500;
  var RETRY_GAP_MS = 8000;
  var MAX_ATTEMPTS = 6;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var states = {
    closed: document.querySelector('[data-auth-state="closed"]'),
    form: document.querySelector('[data-auth-state="form"]'),
    sent: document.querySelector('[data-auth-state="sent"]'),
    account: document.querySelector('[data-auth-state="account"]')
  };
  var form = document.querySelector('[data-auth-form]');
  var emailInput = document.querySelector('[data-auth-email]');
  var honeypot = document.querySelector('[data-auth-hp]');
  var submitBtn = document.querySelector('[data-auth-submit]');
  var message = document.querySelector('[data-auth-message]');
  var sentTo = document.querySelector('[data-auth-sent-to]');
  var accountEmail = document.querySelector('[data-auth-account-email]');
  var signOutBtn = document.querySelector('[data-auth-signout]');

  var formShownAt = 0;
  var lastAttemptAt = 0;
  var attempts = 0;
  var inFlight = false;

  function show(name) {
    Object.keys(states).forEach(function (key) {
      if (states[key]) states[key].classList.toggle('is-current', key === name);
    });
    if (name === 'form' && !formShownAt) formShownAt = Date.now();
  }

  function say(text, ok) {
    if (!message) return;
    if (!text) { message.hidden = true; return; }
    message.hidden = false;
    message.textContent = text;
    message.classList.toggle('auth-msg--ok', Boolean(ok));
  }

  function showSent(email) {
    if (sentTo) sentTo.textContent = email;
    show('sent');
  }

  /* Load the vendored client from our own origin, once, on demand. */
  function loadClient() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) {
        resolve(window.supabase);
        return;
      }
      var s = document.createElement('script');
      s.src = 'assets/vendor/supabase/supabase.js';
      s.onload = function () {
        if (window.supabase && window.supabase.createClient) resolve(window.supabase);
        else reject(new Error('client global missing'));
      };
      s.onerror = function () { reject(new Error('client failed to load')); };
      document.head.appendChild(s);
    });
  }

  /* Not configured: stay on the honest "closed" state and stop. */
  if (!configured) {
    show('closed');
    return;
  }

  init().catch(function () { show('closed'); });

  async function init() {
    var lib = await loadClient();
    var supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    function renderSession(session) {
      if (session && session.user) {
        if (accountEmail) accountEmail.textContent = session.user.email || '';
        show('account');
      } else {
        show('form');
      }
    }

    var got = await supabase.auth.getSession();
    renderSession(got && got.data ? got.data.session : null);

    supabase.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        renderSession(session);
      }
    });

    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        say('');

        if (inFlight) return;

        /* Decoy field: people never see it, form fillers do. Answer exactly
           like a normal send so automation learns nothing, and send nothing. */
        if (honeypot && honeypot.value) {
          showSent((emailInput && emailInput.value || '').trim() || 'your address');
          return;
        }

        var now = Date.now();
        if (formShownAt && now - formShownAt < MIN_FORM_MS) {
          say('That was quick. Give it a second and try again.');
          return;
        }
        if (now - lastAttemptAt < RETRY_GAP_MS) {
          say('Hold on a moment before trying again.');
          return;
        }
        if (attempts >= MAX_ATTEMPTS) {
          say('Too many attempts from this page. Refresh and try again later.');
          return;
        }

        var email = (emailInput && emailInput.value || '').trim();
        if (!EMAIL_RE.test(email) || email.length > 254) {
          say('Enter a valid email address.');
          return;
        }

        lastAttemptAt = now;
        attempts += 1;
        inFlight = true;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending link'; }
        try {
          var result = await supabase.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: window.location.origin + window.location.pathname }
          });
          var error = result ? result.error : null;
          if (!error) {
            showSent(email);
          } else if (/already|exists|registered/i.test(error.message || '')) {
            /* An address that is already on the list gets the same
               confirmation as a new one, so the form never reveals
               whether an email is signed up. */
            showSent(email);
          } else if (error.status === 429) {
            say('Too many requests right now. Please try again in a few minutes.');
          } else {
            say('Something went wrong. Please try again.');
          }
        } catch (err) {
          say('Could not reach the signup service. Check your connection and try again.');
        } finally {
          inFlight = false;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Request early access'; }
        }
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener('click', async function () {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          /* even if the network call fails, fall back to the form view */
        }
        show('form');
      });
    }
  }
})();
