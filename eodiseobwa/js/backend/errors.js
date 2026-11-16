export class AppError extends Error {
  constructor(msg, code) { super(msg); this.code = code; }
}

// Supabase/네트워크 오류 → 한국어 메시지
export function toAppError(err) {
  if (err instanceof AppError) return err;
  const m = String(err?.message || err || '');
  const code = err?.code || err?.error_code || '';
  const map = [
    [/invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않아요.'],
    [/email not confirmed/i, '이메일 인증이 아직 안 됐어요. 메일함의 확인 링크를 눌러 주세요.'],
    [/user already registered|already been registered/i, '이미 가입된 이메일이에요. 로그인해 주세요.'],
    [/password should be at least|weak.?password/i, '비밀번호가 너무 약해요. 8자 이상, 영문과 숫자를 섞어 주세요.'],
    [/unable to validate email|invalid.*email/i, '이메일 형식을 확인해 주세요.'],
    [/rate limit|too many requests|security purposes/i, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
    [/failed to fetch|network|load failed/i, '네트워크 연결을 확인해 주세요.'],
    [/jwt|not authenticated|session/i, '로그인이 만료됐어요. 다시 로그인해 주세요.'],
  ];
  if (code === '23505') return new AppError('이미 사용 중인 닉네임이에요.', 'nick_taken');
  if (code === '23514') return new AppError('사용할 수 없는 닉네임이에요.', 'nick_invalid');
  for (const [re, msg] of map) if (re.test(m)) return new AppError(msg, code);
  console.error(err);
  return new AppError('문제가 생겼어요. 잠시 후 다시 시도해 주세요.', code);
}
