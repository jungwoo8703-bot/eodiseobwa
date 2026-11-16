# 오늘 저녁 어디서 봐?

성향 테스트로 정하는 오늘의 약속 장소. 친구들의 취향(80%)과 출발역 거리(20%)를 합쳐 서울 10개 권역 중 오늘 갈 곳을 정해 주는 웹앱(PWA)입니다.

- 디자인: SEOUL METRO '99 레트로 8비트 콘셉트 (`docs/` 시안 2)
- 기술: HTML/CSS/JS(빌드 불필요) + [Supabase](https://supabase.com)(DB·회원인증)
- 배포: GitHub Pages (https, 안드로이드 홈 화면 설치 가능)

## 현재 구현 (v0.1)

| 기능 | 내용 |
|---|---|
| 회원가입 | 이메일 + 비밀번호(8자 이상, 영문+숫자), 만 14세 이상 확인, 개인정보 수집·이용 동의, 이메일 인증 |
| 로그인/로그아웃 | 세션 유지(앱을 다시 열어도 로그인 상태 유지) |
| 닉네임 생성 | 2~10자, 한글/영문/숫자/_ · 중복 확인(대소문자 무시) · 예약어/비속어 차단 · 🎲 랜덤 닉네임 |
| 닉네임 변경 | 내 정보 > 닉네임 변경 |
| 회원탈퇴 | 안내 확인 + 닉네임 재입력 → 계정·프로필 즉시 삭제 |
| 기타 | 8비트 BGM/효과음, 오프라인 앱 셸 캐시, 데모 모드 |

다음 단계: 약속방 만들기/초대 → 10문항 테스트 → 권역 태그표·점수 계산 → 출발역/거리 → 실시간 순위 → 결과 공유

## 폴더 구조

```
index.html              앱 화면 틀
manifest.webmanifest    PWA 설정(앱 이름, 아이콘)
sw.js                   서비스 워커(오프라인 캐시)  ※ 파일 수정 후 배포할 때 VERSION 올리기
css/style.css           레트로 8비트 디자인
js/app.js               화면 + 라우팅 (#/login, #/nickname, #/me, #/withdraw ...)
js/config.js            Supabase 연결 정보  ← 여기만 채우면 실서비스 모드
js/nickname.js          닉네임 규칙 / 랜덤 생성
js/backend/supabase.js  Supabase 연동
js/backend/mock.js      데모 모드(DB 없이 이 브라우저에만 저장)
supabase/schema.sql     DB 테이블·보안규칙·함수 (SQL Editor에 붙여넣기)
fonts/                  갈무리 픽셀 폰트 (SIL OFL)
docs/                   발표 자료, 디자인 시안
```

## 1. GitHub에 올리고 웹앱 주소 만들기

1. GitHub에서 **New repository** → 이름 예: `eodiseobwa` → Public → Create
2. 저장소 화면의 **uploading an existing file** 클릭 → 이 폴더 안의 파일·폴더 전체를 끌어다 놓기 → Commit
   - GitHub Desktop을 쓰면: File > Add local repository → 이 폴더 선택 → Publish
3. 저장소 **Settings > Pages** → Source: *Deploy from a branch*, Branch: `main` / `/(root)` → Save
4. 1~2분 뒤 `https://<아이디>.github.io/eodiseobwa/` 로 접속 → 화면 하단에 **DEMO** 표시가 보이면 정상
5. 팀원 초대: Settings > Collaborators > Add people

> 이 단계까지는 **데모 모드**입니다. 데이터가 각자 브라우저에만 저장돼서 다른 폰과 공유되지 않습니다.

## 2. Supabase(DB) 연결 — 프로그램 설치 불필요, 전부 웹에서

1. [supabase.com](https://supabase.com) 가입 → **New project**
   - Region: *Northeast Asia (Seoul)* · DB 비밀번호는 따로 보관
2. 왼쪽 메뉴 **SQL Editor** → `supabase/schema.sql` 내용을 전부 붙여넣기 → **Run**
   - "Success. No rows returned"가 나오면 완료 (여러 번 실행해도 안전)
3. **Authentication > URL Configuration**
   - Site URL: `https://<아이디>.github.io/eodiseobwa/`
   - Redirect URLs에도 같은 주소 추가 (인증 메일 링크가 여기로 돌아옴)
4. **Authentication > Sign In / Providers > Email**
   - Confirm email: 켜짐(권장) · Minimum password length: 8
5. **Project Settings > API Keys**(또는 Data API)에서 두 값을 복사해 `js/config.js`에 입력
   - `SUPABASE_URL` = Project URL (`https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` = **anon** 또는 **publishable** 키
6. `config.js`를 GitHub에 다시 올리면(Commit) 하단 DEMO 표시가 사라지고 실서비스 모드로 동작

> ⚠️ **anon/publishable 키는 공개용**이라 GitHub에 올라가도 됩니다(데이터는 `schema.sql`의 RLS 규칙이 보호).
> **service_role / secret 키는 절대 코드나 GitHub에 넣지 마세요.**

### 인증 메일 관련 주의

Supabase 기본 메일 발송기는 **프로젝트 팀원(조직 멤버) 이메일로만, 시간당 소량**만 보냅니다.

- 팀 내부 테스트: 팀원을 Supabase 조직(Organization > Team)에 초대하거나, 테스트 기간에만 Confirm email을 끄기
- 외부 사용자 오픈 전: **Authentication > Emails > SMTP Settings**에서 외부 메일 서비스(Resend, Gmail SMTP 등) 연결
- 메일 문구 한글화: Authentication > Emails > Templates > *Confirm signup*

## 로컬에서 실행 (개발용)

ES 모듈을 쓰기 때문에 `index.html`을 더블클릭하면 동작하지 않습니다. 간단한 로컬 서버가 필요합니다.

- VS Code: 확장 *Live Server* 설치 → `index.html` 우클릭 > Open with Live Server
- Python이 있으면: 이 폴더에서 `python -m http.server 8000` → http://localhost:8000

## 데이터 구조

`public.profiles` (회원 1명 = 1행)

| 컬럼 | 설명 |
|---|---|
| id | `auth.users.id` (회원 계정) — 계정 삭제 시 함께 삭제(cascade) |
| nickname | 2~10자, 대소문자 무시 유일 |
| created_at / updated_at | 생성·수정 시각 |

함수: `is_nickname_available(text)` 중복 확인 · `delete_my_account()` 본인 계정 삭제
보안: RLS로 본인 행만 조회/생성/수정, 비로그인(anon)은 함수 호출 불가

## 라이선스 / 출처

- 폰트: [Galmuri](https://github.com/quiple/galmuri) © Lee Minseo — SIL Open Font License 1.1 (`fonts/Galmuri-OFL.txt`)
