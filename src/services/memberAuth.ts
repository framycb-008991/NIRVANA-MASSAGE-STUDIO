/**
 * Member (client account) authentication via Supabase Auth magic links.
 *
 * The client enters their email, receives a sign-in link, and lands back on
 * the site with a session. The session's access token is sent to member API
 * routes as `Authorization: Bearer <jwt>` (verified server-side in
 * api/_lib/auth.js verifyMemberRequest).
 *
 * Auth is OPTIONAL: when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not
 * set (local dev without backend), isMemberAuthEnabled() is false and every
 * function degrades to a safe no-op — the site keeps working without accounts.
 */

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Reads Vite env vars without requiring vite/client ambient types. */
function viteEnv(): Record<string, string | undefined> {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
}

/** True when the Supabase client-side env vars are configured. */
export function isMemberAuthEnabled(): boolean {
  return Boolean(viteEnv().VITE_SUPABASE_URL && viteEnv().VITE_SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient | null {
  if (!isMemberAuthEnabled()) return null;
  if (!client) {
    client = createClient(
      viteEnv().VITE_SUPABASE_URL as string,
      viteEnv().VITE_SUPABASE_ANON_KEY as string
    );
  }
  return client;
}

/**
 * Sends a magic-link sign-in email. The link returns the user to the current
 * page. Throws on delivery failure.
 */
export async function signInWithEmail(email: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) throw new Error('Member sign-in is not configured.');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.href },
  });
  if (error) throw error;
}

/** Signs the member out and clears the local session. */
export async function signOutMember(): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Current member session, or null when signed out / auth not configured. */
export async function getMemberSession(): Promise<Session | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Access token for member API calls, or null when signed out. */
export async function getMemberAccessToken(): Promise<string | null> {
  const session = await getMemberSession();
  return session?.access_token ?? null;
}

/** Subscribe to sign-in/sign-out events. Returns an unsubscribe function. */
export function onMemberAuthChange(callback: (session: Session | null) => void): () => void {
  const supabase = getClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
