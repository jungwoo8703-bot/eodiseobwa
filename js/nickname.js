// 닉네임 규칙 + 랜덤 생성
export const NICK_MIN = 2;
export const NICK_MAX = 10;
const PATTERN = /^[가-힣A-Za-z0-9_]+$/;

// 서버(supabase/schema.sql)의 check 제약과 같은 목록을 유지할 것
const RESERVED = ['admin', 'administrator', 'operator', 'system', 'root', '운영자', '관리자', '운영진', '어디서봐', '공식'];
// 최소한의 비속어 필터 (필요 시 확장)
const BANNED = ['시발', '씨발', 'ㅅㅂ', '병신', '좆', '존나', '개새', '새끼', '지랄', '미친놈', '미친년', 'fuck', 'shit', 'bitch'];

export function validateNickname(raw) {
  const nick = (raw ?? '').trim();
  if (!nick) return { ok: false, msg: '닉네임을 입력해 주세요.' };
  const len = [...nick].length;
  if (len < NICK_MIN) return { ok: false, msg: `${NICK_MIN}자 이상 입력해 주세요.` };
  if (len > NICK_MAX) return { ok: false, msg: `${NICK_MAX}자 이하로 입력해 주세요.` };
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(nick)) return { ok: false, msg: '자음·모음만 따로 쓸 수 없어요.' };
  if (!PATTERN.test(nick)) return { ok: false, msg: '한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요.' };
  const low = nick.toLowerCase();
  if (RESERVED.some(w => low.includes(w))) return { ok: false, msg: '운영용으로 예약된 단어가 들어 있어요.' };
  if (BANNED.some(w => low.includes(w))) return { ok: false, msg: '사용할 수 없는 단어가 들어 있어요.' };
  return { ok: true, nick };
}

// 꾸밈말 100개 (2~5자)
const ADJ = [
  // 시간·퇴근
  '퇴근한', '칼퇴한', '정시퇴근', '야근끝난', '반차쓴', '연차낸', '월요일의', '금요일의', '불금의', '주말의', '점심먹은', '퇴근길',
  // 이동·지하철
  '환승하는', '막차탄', '첫차탄', '급행탄', '갈아탄', '2호선탄', '버스탄', '택시탄', '출구찾는', '길잃은', '지각한', '한강건넌', '걸어온', '뛰어온', '역세권',
  // 약속·모임
  '약속잡은', '일찍온', '늦게온', '먼저온', '답장빠른', '읽씹하는', '투표하는', '고민하는', '눈치보는', '흥많은', '건배하는', '짠하는', '2차가는', '3차가는', '계산하는', '엔빵하는', '총대멘',
  // 맛·먹방
  '배고픈', '출출한', '배부른', '야식먹는', '맛집찾는', '웨이팅중', '줄서는', '신상찾는', '노포가는', '매운맛찾는', '입짧은', '먹성좋은', '바삭한', '촉촉한', '달달한', '매콤한', '고소한', '쫄깃한', '따끈한', '시원한',
  // 분위기·밤
  '야장가는', '옥상오른', '힙한', '감성충만', '레트로', '반짝이는', '몽글몽글', '낭만있는', '잔잔한', '시끌벅적', '조용한', '새벽감성', '별보는', '노을보는', '한강가는', '산책하는', '공연보는', '전시보는',
  // 성격·기분
  '설레는', '느긋한', '신난', '들뜬', '수줍은', '용감한', '졸린', '씩씩한', '다정한', '엉뚱한', '부지런한', '게으른', '행복한', '멋부린', '해맑은', '진지한', '쿨한', '소심한',
];

// 뒷말: 분류를 먼저 고르고(분류별 확률 동일) 그 안에서 단어를 고름 (1~4자)
const NOUNS = {
  동물: ['너구리', '고양이', '강아지', '판다', '펭귄', '수달', '해달', '다람쥐', '햄스터', '오리', '병아리', '여우', '토끼', '부엉이', '두더지',
    '알파카', '고슴도치', '곰', '코알라', '미어캣', '거북이', '고래', '쿼카', '레서판다', '카피바라'],
  직업: ['요리사', '제빵사', '바리스타', '바텐더', '소믈리에', '기관사', '역무원', '우체부', '택배기사', '소방관', '경찰관', '탐정', '마술사', '발명가',
    '과학자', '화가', '작곡가', '사진작가', '정원사', '사육사', '수의사', '사서', '집사', '선생님', '회계사'],
};
const CATEGORIES = Object.keys(NOUNS);
const pick = a => a[Math.floor(Math.random() * a.length)];

export function randomNickname(withNumber = false) {
  // 숫자 2자리를 붙여도 10자를 넘지 않도록 단어 부분은 8자 이내로 조합
  let n;
  do { n = pick(ADJ) + pick(NOUNS[pick(CATEGORIES)]); } while ([...n].length > NICK_MAX - 2);
  if (withNumber) n += String(Math.floor(Math.random() * 90) + 10);
  return n;
}

export const NICK_WORDS = { ADJ, NOUNS }; // 테스트·검수용
