/* RipCo early access. Loaded as a module on account.html only.

   ============================ SUPABASE CONFIG ============================
   Fill these two values from your Supabase project (Settings > API) to
   switch early-access signups on. While they are empty, the page shows an
   honest "early access isn't open yet" state. It never fakes a signup,
   a success message or a signed-in session.

   The official client is loaded with a single module import:
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   (done lazily below, only once real keys are present, so the page works
   fully offline while unconfigured).
   ========================================================================= */

const SUPABASE_URL = '';      // e.g. 'https://yourproject.supabase.co'
const SUPABASE_ANON_KEY = ''; // the anon public key, not the service key

/* ========================================================================= */

const configured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;

const states = {
  closed: document.querySelector('[data-auth-state="closed"]'),
  form: document.querySelector('[data-auth-state="form"]'),
  sent: document.querySelector('[data-auth-state="sent"]'),
  account: document.querySelector('[data-auth-state="account"]'),
};
const form = document.querySelector('[data-auth-form]');
const emailInput = document.querySelector('[data-auth-email]');
const submitBtn = document.querySelector('[data-auth-submit]');
const message = document.querySelector('[data-auth-message]');
const sentTo = document.querySelector('[data-auth-sent-to]');
const accountEmail = document.querySelector('[data-auth-account-email]');
const signOutBtn = document.querySelector('[data-auth-signout]');

function show(name) {
  Object.keys(states).forEach((key) => {
    if (states[key]) states[key].classList.toggle('is-current', key === name);
  });
}

function say(text, ok) {
  if (!message) return;
  if (!text) { message.hidden = true; return; }
  message.hidden = false;
  message.textContent = text;
  message.classList.toggle('auth-msg--ok', Boolean(ok));
}

/* Not configured: stay on the honest "closed" state and stop. */
if (!configured) {
  show('closed');
} else {
  init().catch(() => {
    show('closed');
  });
}

async function init() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const renderSession = (session) => {
    if (session && session.user) {
      if (accountEmail) accountEmail.textContent = session.user.email || '';
      show('account');
    } else {
      show('form');
    }
  };

  const { data } = await supabase.auth.getSession();
  renderSession(data ? data.session : null);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
      renderSession(session);
    }
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      say('');
      const email = (emailInput && emailInput.value || '').trim();
      if (!email || !email.includes('@')) {
        say('Enter a valid email address.');
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending link'; }
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: window.location.href },
        });
        if (error) {
          say(error.message || 'Something went wrong. Please try again.');
        } else {
          if (sentTo) sentTo.textContent = email;
          show('sent');
        }
      } catch (err) {
        say('Could not reach the signup service. Check your connection and try again.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Request early access'; }
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        /* even if the network call fails, fall back to the form view */
      }
      show('form');
    });
  }
}
