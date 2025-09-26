import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Load Supabase from ESM CDN
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Wire up Google OAuth button if present
const googleBtn = document.getElementById('oauthGoogle');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    try {
      const redirectTo = window.location.origin; // adjust if needed (Render domain)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      console.error('OAuth error:', err);
      alert('Sign-in failed. Please try again.');
    }
  });
}

// Optional: react to session changes
supabase.auth.onAuthStateChange((_event, session) => {
  // You can store user info and close overlay if logged in
  if (session?.user) {
    try { window.userName = session.user.user_metadata?.full_name || session.user.email || 'User'; } catch {}
    const overlay = document.getElementById('introOverlay');
    if (overlay) overlay.classList.remove('show', 'hiding');
  }
});
