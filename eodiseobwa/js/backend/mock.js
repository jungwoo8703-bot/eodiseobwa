// 데모 어댑터: 서버 없이 이 브라우저에만 저장 (DB 연결 전 체험용)
import { AppError } from './errors.js';

const KEY = 'eodiseobwa_demo_v1';
let memory = null;

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return memory || { users: {}, profiles: {}, session: null };
}
function save(db) {
  memory = db;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
}
async function hash(pw) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('demo:' + pw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return 'plain:' + pw; }
}
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'u' + Date.now() + Math.random().toString(16).slice(2));

export function createMockBackend() {
  const listeners = [];
  const emit = () => { const db = load(); const u = db.session ? db.users[db.session] : null; listeners.forEach(f => f(u)); };

  return {
    mode: 'demo',
    async init() { return {}; },

    async getUser() {
      const db = load();
      const u = db.session && db.users[db.session];
      return u ? { id: u.id, email: u.email, createdAt: u.createdAt } : null;
    },

    onAuthChange(cb) { listeners.push(cb); },

    async signUp(email, password) {
      await wait();
      const db = load();
      const e = email.toLowerCase();
      if (Object.values(db.users).some(u => u.email === e)) throw new AppError('이미 가입된 이메일이에요. 로그인해 주세요.', 'exists');
      const id = uid();
      db.users[id] = { id, email: e, pw: await hash(password), createdAt: new Date().toISOString() };
      db.session = id;
      save(db); emit();
      return { needsConfirm: false };
    },

    async resendConfirm() { await wait(); },

    async signIn(email, password) {
      await wait();
      const db = load();
      const u = Object.values(db.users).find(x => x.email === email.toLowerCase());
      if (!u || u.pw !== await hash(password)) throw new AppError('이메일 또는 비밀번호가 맞지 않아요.', 'creds');
      db.session = u.id; save(db); emit();
    },

    async signOut() { const db = load(); db.session = null; save(db); emit(); },

    async getProfile() {
      const db = load();
      const p = db.session && db.profiles[db.session];
      return p ? { nickname: p.nickname, createdAt: p.createdAt } : null;
    },

    async isNicknameAvailable(nick) {
      await wait(150);
      const db = load();
      const low = nick.trim().toLowerCase();
      return !Object.entries(db.profiles).some(([id, p]) => id !== db.session && p.nickname.toLowerCase() === low);
    },

    async saveNickname(nick) {
      await wait();
      const db = load();
      if (!db.session) throw new AppError('로그인이 필요해요.', 'auth');
      if (!(await this.isNicknameAvailable(nick))) throw new AppError('이미 사용 중인 닉네임이에요.', 'nick_taken');
      const prev = db.profiles[db.session];
      db.profiles[db.session] = { nickname: nick, createdAt: prev?.createdAt || new Date().toISOString() };
      save(db);
      return { ...db.profiles[db.session] };
    },

    async deleteAccount() {
      await wait(400);
      const db = load();
      if (!db.session) throw new AppError('로그인이 필요해요.', 'auth');
      delete db.users[db.session];
      delete db.profiles[db.session];
      db.session = null;
      save(db); emit();
    },
  };
}
