// Supabase 어댑터 (실서비스)
import { AppError, toAppError } from './errors.js';

const SDK_URL = 'https://esm.sh/@supabase/supabase-js@2';

export async function createSupabaseBackend(url, key) {
  // 이메일 인증 링크로 돌아온 경우의 URL 해시를 SDK 가 지우기 전에 보관
  const landingHash = new URLSearchParams(location.hash.slice(1));
  const { createClient } = await import(/* @vite-ignore */ SDK_URL);
  const sb = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });
  const redirectTo = location.origin + location.pathname;
  const run = async (p) => { const { data, error } = await p; if (error) throw toAppError(error); return data; };

  return {
    mode: 'supabase',

    async init() {
      const h = landingHash;
      const linkError = h.get('error_description') || h.get('error');
      await sb.auth.getSession();
      if (h.has('access_token') || linkError) history.replaceState(null, '', location.pathname + '#/');
      if (linkError) {
        return { notice: /expired/i.test(linkError) ? '인증 링크가 만료됐어요. 로그인 화면에서 메일을 다시 받아 주세요.' : '인증 링크가 올바르지 않아요.' };
      }
      if (h.get('type') === 'signup') return { notice: '이메일 인증 완료! 탑승을 환영해요.' };
      return {};
    },

    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      return u ? { id: u.id, email: u.email, createdAt: u.created_at } : null;
    },

    onAuthChange(cb) { sb.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null)); },

    async signUp(email, password) {
      const data = await run(sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }));
      // 이미 가입된 이메일이면 Supabase 는 identities 가 빈 사용자 객체를 돌려줌
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new AppError('이미 가입된 이메일이에요. 로그인해 주세요.', 'exists');
      }
      return { needsConfirm: !data.session };
    },

    async resendConfirm(email) {
      await run(sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } }));
    },

    async signIn(email, password) { await run(sb.auth.signInWithPassword({ email, password })); },

    async signOut() { await sb.auth.signOut(); },

    async getProfile() {
      const user = await this.getUser();
      if (!user) return null;
      const data = await run(sb.from('profiles').select('nickname, created_at').eq('id', user.id).maybeSingle());
      return data ? { nickname: data.nickname, createdAt: data.created_at } : null;
    },

    async isNicknameAvailable(nick) {
      return await run(sb.rpc('is_nickname_available', { p_nickname: nick }));
    },

    async saveNickname(nick) {
      const user = await this.getUser();
      if (!user) throw new AppError('로그인이 필요해요.', 'auth');
      const existing = await this.getProfile();
      const q = existing
        ? sb.from('profiles').update({ nickname: nick }).eq('id', user.id).select('nickname, created_at').single()
        : sb.from('profiles').insert({ id: user.id, nickname: nick }).select('nickname, created_at').single();
      const data = await run(q);
      return { nickname: data.nickname, createdAt: data.created_at };
    },

    async deleteAccount() {
      await run(sb.rpc('delete_my_account'));
      await sb.auth.signOut({ scope: 'local' }).catch(() => {});
    },
  };
}
