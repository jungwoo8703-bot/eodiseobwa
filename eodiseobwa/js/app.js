// 오늘 저녁 어디서 봐? — 앱 진입점 (라우터 + 화면)
import { createBackend } from './backend/index.js';
import { toAppError } from './backend/errors.js';
import { validateNickname, randomNickname, NICK_MAX } from './nickname.js';
import { sprite, buddy, TRAIN, COIN, CHIP, SKULL, ENVELOPE } from './pixel.js';
import { setBgm, sfx } from './sound.js';

const $ = (s, el = document) => el.querySelector(s);
const screenEl = $('#screen');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = iso => { if (!iso) return '-'; const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
const playerNo = id => (id || '').replace(/-/g, '').slice(0, 6).toUpperCase() || '------';
// 조사: 받침 유무로 선택, 판단 불가(영문·숫자 등)면 병기
const josa = (word, pair) => {
  const [a, b] = pair.split('/');
  const c = String(word).slice(-1).charCodeAt(0);
  if (c < 0xAC00 || c > 0xD7A3) return word + a + '(' + b + ')';
  const jong = (c - 0xAC00) % 28;
  if (pair === '으로/로') return word + (jong && jong !== 8 ? '으로' : '로');
  return word + (jong ? a : b);
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const state = { backend: null, user: null, profile: null, sound: false, pendingEmail: '', byeNick: '', authTab: 'login' };

/* ---------- 공통 UI ---------- */
let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast on' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), 2800);
  if (state.sound) sfx(err ? 'err' : 'ok');
}
function go(path) { if (location.hash !== '#' + path) location.hash = path; else route(); }
function render(html, after) {
  screenEl.innerHTML = html;
  screenEl.scrollTop = 0;
  screenEl.focus({ preventScroll: true });
  after?.();
}
function setFooter() {
  const f = $('#footmsg');
  if (state.user && state.profile) { f.textContent = `PLAYER 1: ${state.profile.nickname}`; f.classList.remove('blink'); }
  else { f.textContent = 'INSERT COIN TO RIDE'; f.classList.add('blink'); }
}
async function busy(btn, label, fn) {
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = `${label}<span class="dots"></span>`;
  try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
}
const board = ({ kick, title, sub = '', tag = '', h = 'h2' }) =>
  `<div class="board"><div class="kick">${kick}</div><${h}>${title}</${h}>${sub ? `<div class="sub">${sub}</div>` : ''}${tag ? `<span class="tag">${tag}</span>` : ''}</div>`;
const passCard = (nick, rows) => `
  <div class="pass" aria-label="플레이어 승차권">
    <div class="top"><span>SEOUL METRO '99 · PLAYER PASS</span><span>1인 1매</span></div>
    <div class="nick ${nick ? '' : 'empty'}" id="passNick">${esc(nick || '닉네임')}</div>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="chip">${sprite(CHIP, { scale: 4 })}</div>
  </div>`;
const passRows = () => [['NO.', playerNo(state.user?.id)], ['이메일', state.user?.email || '-'], ['발급일', fmtDate(state.profile?.createdAt || state.user?.createdAt)]];

/* ---------- 화면 ---------- */
function viewTitle() {
  const loggedIn = state.user && state.profile;
  render(`
  <div class="view">
    ${board({ kick: '수도권 전철 00/20 호선', title: '<span class="nw">오늘 저녁</span> <span class="nw">어디서 봐?</span>', sub: '[취향 80% + 거리 20%] 최적의 약속역 배틀', tag: 'SELECT STATION V2.0', h: 'h1' })}
    <div class="panel story">
      <div class="sprites">${sprite(TRAIN, { scale: 4, label: '전철' })}${buddy('#B9A6F2')}${buddy('#9EE3F0')}</div>
      <p>"지은이는 을지로, 현우는 강남, 나는 홍대...<br>시끄러운 건 싫고, 막차는 지켜야 해!"</p>
      <p class="em">10개 문항을 통과해 우리만의 종착역을 찾자!</p>
    </div>
    <div class="spacer"></div>
    <button class="btn coin" id="start" type="button"><span class="star">★</span> ${loggedIn ? 'CONTINUE (이어하기)' : 'INSERT COIN (게임 시작)'} <span class="star">★</span></button>
    <button class="btn sub" type="button" disabled>⚡ 3인 파티 시뮬레이션 <span class="soon">COMING SOON</span></button>
  </div>`, () => {
    $('#start').onclick = () => { if (state.sound) sfx('coin'); go(loggedIn ? '/home' : state.user ? '/nickname' : '/login'); };
  });
}

function viewAuth(tab) {
  const signup = tab === 'signup';
  render(`
  <div class="view">
    ${board({ kick: 'TICKET GATE', title: signup ? '승차권 발급' : '개찰구 통과', tag: signup ? 'NEW PLAYER' : 'PLAYER LOGIN' })}
    <div class="tabs" role="tablist">
      <button role="tab" type="button" aria-selected="${!signup}" data-tab="login">로그인</button>
      <button role="tab" type="button" aria-selected="${signup}" data-tab="signup">회원가입</button>
    </div>
    <form class="panel form" id="authForm" novalidate>
      <div class="field">
        <label for="email">이메일</label>
        <div class="wrap"><input id="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${esc(state.pendingEmail)}" required></div>
        <div class="hint" id="emailHint"></div>
      </div>
      <div class="field">
        <label for="pw">비밀번호</label>
        <div class="wrap"><input id="pw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? '8자 이상, 영문+숫자' : ''}" maxlength="72" required><button type="button" id="pwToggle" aria-label="비밀번호 보기">보기</button></div>
        <div class="hint" id="pwHint"></div>
      </div>
      ${signup ? `
      <div class="field">
        <label for="pw2">비밀번호 확인</label>
        <div class="wrap"><input id="pw2" type="password" autocomplete="new-password" maxlength="72" required></div>
        <div class="hint" id="pw2Hint"></div>
      </div>
      <label class="check"><input type="checkbox" id="age"><span>(필수) 만 14세 이상입니다.</span></label>
      <div>
        <label class="check"><input type="checkbox" id="terms"><span>(필수) 개인정보 수집·이용에 동의합니다. <button type="button" class="link" id="termsToggle" aria-expanded="false">내용 보기</button></span></label>
        <div class="terms" id="termsBox" hidden>
          <table>
            <tr><td>수집 항목</td><td>이메일, 비밀번호(암호화 저장), 닉네임</td></tr>
            <tr><td>이용 목적</td><td>회원 식별, 약속방 참여자 표시</td></tr>
            <tr><td>보유 기간</td><td>회원탈퇴 시 즉시 파기</td></tr>
          </table>
          <p style="margin:6px 0 0">동의를 거부할 수 있으나, 거부하면 회원가입을 할 수 없어요.</p>
        </div>
      </div>` : ''}
      <div class="hint err" id="formHint" role="alert"></div>
      <button class="btn coin" id="submit" type="submit">${signup ? '가입하고 승차권 받기' : '탑승하기'}</button>
      <button class="link" id="resend" type="button" hidden>인증 메일 다시 받기</button>
    </form>
    <button class="link" type="button" id="back">← 타이틀로</button>
  </div>`, () => {
    screenEl.querySelectorAll('[data-tab]').forEach(b => (b.onclick = () => { state.pendingEmail = $('#email').value.trim(); go('/' + b.dataset.tab); }));
    $('#back').onclick = () => go('/');
    $('#pwToggle').onclick = e => {
      const pw = $('#pw'), show = pw.type === 'password';
      pw.type = show ? 'text' : 'password'; if ($('#pw2')) $('#pw2').type = pw.type;
      e.currentTarget.textContent = show ? '숨김' : '보기';
      e.currentTarget.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
    };
    const email = $('#email'), pw = $('#pw'), pw2 = $('#pw2');
    const setHint = (el, msg, kind = '') => { el.textContent = msg; el.className = 'hint' + (kind ? ' ' + kind : ''); };
    const checkEmail = () => { const ok = EMAIL_RE.test(email.value.trim()); setHint($('#emailHint'), email.value && !ok ? '이메일 형식을 확인해 주세요.' : '', ok ? '' : 'err'); return ok; };
    const checkPw = () => {
      if (!signup) return pw.value.length > 0;
      const v = pw.value, ok = v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
      setHint($('#pwHint'), !v ? '8자 이상, 영문과 숫자를 섞어 주세요.' : ok ? '좋아요!' : '8자 이상, 영문과 숫자를 섞어 주세요.', !v ? '' : ok ? 'ok' : 'err');
      return ok;
    };
    const checkPw2 = () => { if (!signup) return true; const ok = pw2.value && pw2.value === pw.value; setHint($('#pw2Hint'), pw2.value ? (ok ? '일치해요.' : '비밀번호가 서로 달라요.') : '', ok ? 'ok' : 'err'); return !!ok; };
    email.onblur = checkEmail;
    pw.oninput = () => { checkPw(); if (signup && pw2.value) checkPw2(); };
    if (signup) {
      pw2.oninput = checkPw2;
      checkPw();
      $('#termsToggle').onclick = e => { e.preventDefault(); const box = $('#termsBox'); box.hidden = !box.hidden; e.currentTarget.setAttribute('aria-expanded', String(!box.hidden)); e.currentTarget.textContent = box.hidden ? '내용 보기' : '접기'; };
    }
    $('#resend').onclick = async e => {
      try { await busy(e.currentTarget, '보내는 중', () => state.backend.resendConfirm(email.value.trim())); toast('인증 메일을 다시 보냈어요.'); }
      catch (err) { toast(toAppError(err).message, true); }
    };
    $('#authForm').onsubmit = async e => {
      e.preventDefault();
      const fh = $('#formHint'); setHint(fh, '', 'err'); $('#resend').hidden = true;
      const okE = checkEmail(), okP = checkPw(), okP2 = checkPw2();
      if (!okE) return setHint(fh, '이메일을 확인해 주세요.', 'err'), email.focus();
      if (!okP) return setHint(fh, signup ? '비밀번호 조건을 확인해 주세요.' : '비밀번호를 입력해 주세요.', 'err'), pw.focus();
      if (!okP2) return setHint(fh, '비밀번호 확인이 일치하지 않아요.', 'err'), pw2.focus();
      if (signup && !$('#age').checked) return setHint(fh, '만 14세 이상만 가입할 수 있어요.', 'err');
      if (signup && !$('#terms').checked) return setHint(fh, '개인정보 수집·이용에 동의해 주세요.', 'err');
      const em = email.value.trim();
      try {
        await busy($('#submit'), signup ? '발급 중' : '확인 중', async () => {
          if (signup) {
            const { needsConfirm } = await state.backend.signUp(em, pw.value);
            if (needsConfirm) { state.pendingEmail = em; return go('/sent'); }
          } else {
            await state.backend.signIn(em, pw.value);
          }
          await refreshSession();
          if (state.sound) sfx('coin');
          go(state.profile ? '/home' : '/nickname');
        });
      } catch (err) {
        const ae = toAppError(err);
        setHint(fh, ae.message, 'err'); if (state.sound) sfx('err');
        if (/인증이 아직/.test(ae.message)) { $('#resend').hidden = false; }
      }
    };
  });
}

function viewSent() {
  if (!state.pendingEmail) return go('/login');
  render(`
  <div class="view">
    ${board({ kick: 'MAIL CHECK', title: '메일함을 확인해 줘!', tag: 'STEP 1/2' })}
    <div class="panel story">
      <div class="sprites">${sprite(ENVELOPE, { scale: 5, label: '편지' })}</div>
      <p><b>${esc(state.pendingEmail)}</b> 주소로<br>인증 메일을 보냈어요.</p>
      <p class="em">메일의 링크를 누르면 가입 완료!</p>
      <p class="muted" style="margin-top:8px">메일이 안 보이면 스팸함도 확인해 주세요.</p>
    </div>
    <div class="spacer"></div>
    <button class="btn ghost" id="resend" type="button">인증 메일 다시 보내기</button>
    <button class="btn coin" id="toLogin" type="button">인증했어요, 로그인하기</button>
  </div>`, () => {
    $('#toLogin').onclick = () => go('/login');
    $('#resend').onclick = async e => {
      const btn = e.currentTarget;
      try {
        await busy(btn, '보내는 중', () => state.backend.resendConfirm(state.pendingEmail));
        toast('인증 메일을 다시 보냈어요.');
        let s = 60; btn.disabled = true;
        const t = setInterval(() => { if (!btn.isConnected) return clearInterval(t); btn.textContent = `다시 보내기 (${--s}초)`; if (s <= 0) { clearInterval(t); btn.disabled = false; btn.textContent = '인증 메일 다시 보내기'; } }, 1000);
      } catch (err) { toast(toAppError(err).message, true); }
    };
  });
}

function viewNickname() {
  const editing = !!state.profile;
  const current = state.profile?.nickname || '';
  render(`
  <div class="view">
    ${board(editing
      ? { kick: 'MY PAGE', title: '닉네임 변경', tag: 'RENAME' }
      : { kick: 'STEP 2/2 · 닉네임', title: '플레이어 이름을 정해줘!', tag: 'NEW PLAYER' })}
    ${passCard(current, passRows())}
    <form class="panel form" id="nickForm" novalidate>
      <div class="field">
        <label for="nick">닉네임</label>
        <div class="wrap">
          <input id="nick" type="text" autocomplete="nickname" autocapitalize="off" spellcheck="false" maxlength="20" value="${esc(current)}" placeholder="예) 막차탄너구리">
          <span class="counter" id="cnt">0/${NICK_MAX}</span>
          <button type="button" id="dice" aria-label="랜덤 닉네임">🎲 랜덤</button>
        </div>
        <div class="hint" id="nickHint" aria-live="polite"></div>
      </div>
      <p class="muted">2~${NICK_MAX}자 · 한글/영문/숫자/밑줄(_) · 약속방에서 친구들에게 보이는 이름이에요.</p>
      <button class="btn coin" id="submit" type="submit" disabled>${editing ? '변경하기' : '이 이름으로 탑승!'}</button>
    </form>
    ${editing ? '<button class="link" type="button" id="back">← 내 정보로</button>' : '<button class="link" type="button" id="logout">다른 계정으로 로그인</button>'}
  </div>`, () => {
    const input = $('#nick'), hint = $('#nickHint'), submit = $('#submit');
    let seq = 0, timer, available = false;
    const setHint = (msg, kind = '') => { hint.textContent = msg; hint.className = 'hint' + (kind ? ' ' + kind : ''); };
    const update = () => {
      const v = input.value.trim();
      $('#cnt').textContent = `${[...v].length}/${NICK_MAX}`;
      const p = $('#passNick'); p.textContent = v || '닉네임'; p.classList.toggle('empty', !v);
      available = false; submit.disabled = true; clearTimeout(timer);
      if (!v) return setHint('');
      const r = validateNickname(v);
      if (!r.ok) return setHint(r.msg, 'err');
      if (editing && r.nick === current) return setHint('지금 쓰고 있는 닉네임이에요.');
      setHint('확인 중...');
      const my = ++seq;
      timer = setTimeout(async () => {
        try {
          const ok = await state.backend.isNicknameAvailable(r.nick);
          if (my !== seq) return;
          available = ok; submit.disabled = !ok;
          setHint(ok ? '사용할 수 있는 닉네임이에요!' : '이미 사용 중인 닉네임이에요.', ok ? 'ok' : 'err');
        } catch (err) { if (my === seq) setHint(toAppError(err).message, 'err'); }
      }, 350);
    };
    input.oninput = update;
    $('#dice').onclick = async () => {
      for (let i = 0; i < 6; i++) {
        const n = randomNickname(i >= 2);
        try { if (await state.backend.isNicknameAvailable(n)) { input.value = n; update(); return; } } catch { break; }
      }
      input.value = randomNickname(true); update();
    };
    $('#nickForm').onsubmit = async e => {
      e.preventDefault();
      const r = validateNickname(input.value);
      if (!r.ok || !available) return;
      try {
        await busy(submit, '저장 중', async () => {
          state.profile = await state.backend.saveNickname(r.nick);
          setFooter();
          toast(editing ? '닉네임을 바꿨어요.' : `${r.nick}님, 탑승 완료!`);
          go(editing ? '/me' : '/home');
        });
      } catch (err) { const ae = toAppError(err); setHint(ae.message, 'err'); if (state.sound) sfx('err'); }
    };
    if (editing) $('#back').onclick = () => go('/me');
    else $('#logout').onclick = async () => { await state.backend.signOut(); state.user = null; state.profile = null; setFooter(); go('/login'); };
    update();
    if (!editing && !input.value) input.focus();
  });
}

function viewHome() {
  const nick = state.profile.nickname;
  render(`
  <div class="view">
    ${board({ kick: 'PLAYER 1 READY', title: `${esc(nick)}님, 어서 와요!`, tag: 'STAGE SELECT' })}
    ${passCard(nick, passRows())}
    <div class="spacer"></div>
    <button class="btn coin" type="button" disabled>새 약속방 만들기 <span class="soon">COMING SOON</span></button>
    <button class="btn sub" type="button" disabled>초대 코드로 참여 <span class="soon">COMING SOON</span></button>
    <button class="btn ghost" type="button" id="me">내 정보</button>
  </div>`, () => { $('#me').onclick = () => go('/me'); });
}

function viewMe() {
  render(`
  <div class="view">
    ${board({ kick: 'MY PAGE', title: '내 승차권', tag: state.backend.mode === 'demo' ? 'DEMO MODE' : 'ACTIVE' })}
    ${passCard(state.profile.nickname, passRows())}
    <div class="btn-row">
      <button class="btn ghost" type="button" id="rename">닉네임 변경</button>
      <button class="btn ghost" type="button" id="logout">로그아웃</button>
    </div>
    <div class="spacer"></div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <button class="link" type="button" id="home">← 홈으로</button>
      <button class="link red" type="button" id="withdraw">회원탈퇴</button>
    </div>
  </div>`, () => {
    $('#home').onclick = () => go('/home');
    $('#rename').onclick = () => go('/nickname');
    $('#withdraw').onclick = () => go('/withdraw');
    $('#logout').onclick = async e => {
      await busy(e.currentTarget, '로그아웃', () => state.backend.signOut());
      state.user = null; state.profile = null; setFooter();
      toast('로그아웃했어요. 또 만나요!'); go('/');
    };
  });
}

function viewWithdraw() {
  const nick = state.profile.nickname;
  render(`
  <div class="view">
    ${board({ kick: 'LAST STOP', title: '정말 하차할까요?', tag: '회원탈퇴' })}
    <div class="panel">
      <h3>탈퇴하면 이렇게 돼요</h3>
      <ul class="warn">
        <li>계정(${esc(state.user.email)})과 닉네임 <b>${esc(nick)}</b>${josa(nick, '이/가').slice(nick.length)} 즉시 삭제돼요.</li>
        <li>삭제된 정보는 복구할 수 없어요.</li>
        <li>같은 닉네임을 다른 사람이 쓸 수 있게 돼요.</li>
        <li>같은 이메일로 언제든 다시 가입할 수 있어요.</li>
      </ul>
    </div>
    <form class="panel form" id="wdForm" novalidate>
      <label class="check"><input type="checkbox" id="agree"><span>위 내용을 모두 확인했어요.</span></label>
      <div class="field">
        <label for="confirm">확인을 위해 닉네임 <b>${esc(nick)}</b>${josa(nick, '을/를').slice(nick.length)} 입력해 주세요</label>
        <div class="wrap"><input id="confirm" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      </div>
      <div class="hint err" id="wdHint" role="alert"></div>
      <button class="btn danger" id="submit" type="submit" disabled>탈퇴하기</button>
    </form>
    <button class="btn ghost" type="button" id="stay">계속 이용할래요</button>
  </div>`, () => {
    const agree = $('#agree'), confirm = $('#confirm'), submit = $('#submit');
    const sync = () => { submit.disabled = !(agree.checked && confirm.value.trim() === nick); };
    agree.onchange = sync; confirm.oninput = sync;
    $('#stay').onclick = () => go('/me');
    $('#wdForm').onsubmit = async e => {
      e.preventDefault(); sync(); if (submit.disabled) return;
      try {
        await busy(submit, '처리 중', () => state.backend.deleteAccount());
        state.byeNick = nick; state.user = null; state.profile = null; setFooter();
        if (state.sound) sfx('over');
        go('/bye');
      } catch (err) { $('#wdHint').textContent = toAppError(err).message; if (state.sound) sfx('err'); }
    };
  });
}

function viewBye() {
  if (!state.byeNick) return go('/');
  render(`
  <div class="view center gameover">
    <div>${sprite(SKULL, { scale: 7, label: '게임 오버' })}</div>
    <div class="big">GAME OVER</div>
    <div class="panel">
      <p>탈퇴가 완료됐어요.<br><b>${esc(state.byeNick)}</b>님, 그동안 함께 해줘서 고마워요.</p>
      <p class="muted" style="margin-top:8px">CONTINUE? 언제든 다시 탑승할 수 있어요.</p>
    </div>
    <button class="btn coin" type="button" id="again">${sprite(COIN, { scale: 3 })} 타이틀로</button>
  </div>`, () => { $('#again').onclick = () => { state.byeNick = ''; go('/'); }; });
}

/* ---------- 라우터 ---------- */
const ROUTES = {
  '/': { view: viewTitle },
  '/login': { view: () => viewAuth('login'), guest: true },
  '/signup': { view: () => viewAuth('signup'), guest: true },
  '/sent': { view: viewSent, guest: true },
  '/nickname': { view: viewNickname, auth: true },
  '/home': { view: viewHome, auth: true, profile: true },
  '/me': { view: viewMe, auth: true, profile: true },
  '/withdraw': { view: viewWithdraw, auth: true, profile: true },
  '/bye': { view: viewBye },
};

function route() {
  const path = (location.hash.replace(/^#/, '').split('?')[0]) || '/';
  const r = ROUTES[path];
  if (!r) return go('/');
  if (r.auth && !state.user) return go('/login');
  if (r.profile && !state.profile) return go('/nickname');
  if (r.guest && state.user) return go(state.profile ? '/home' : '/nickname');
  r.view();
}

async function refreshSession() {
  state.user = await state.backend.getUser();
  state.profile = state.user ? await state.backend.getProfile() : null;
  setFooter();
}

async function boot() {
  const bgm = $('#bgm');
  bgm.onclick = () => { state.sound = setBgm(!state.sound); bgm.setAttribute('aria-pressed', String(state.sound)); };

  try {
    state.backend = await createBackend();
    if (state.backend.mode === 'demo') $('#demo').innerHTML = '<span class="demo-badge" title="DB 미연결: 이 브라우저에만 저장">DEMO</span>';
    const { notice } = (await state.backend.init()) || {};
    await refreshSession();
    state.backend.onAuthChange(u => {
      const changed = (u?.id || null) !== (state.user?.id || null);
      if (!changed) return;
      setTimeout(async () => { await refreshSession().catch(() => {}); route(); }, 0);
    });
    window.addEventListener('hashchange', route);
    route();
    if (notice) toast(notice, /만료|올바르지/.test(notice));
  } catch (err) {
    render(`<div class="view center"><div class="panel story"><p><b>서버에 연결하지 못했어요.</b></p><p class="muted">${esc(toAppError(err).message)}</p></div><button class="btn coin" onclick="location.reload()">다시 시도</button></div>`);
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
