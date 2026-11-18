-- 오늘 저녁 어디서 봐? — 회원/닉네임/탈퇴 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)

-- 1) 프로필 (회원 1명 = 1행, auth.users 삭제 시 함께 삭제)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint nickname_length  check (char_length(nickname) between 2 and 10),
  constraint nickname_charset check (nickname ~ '^[가-힣A-Za-z0-9_]+$'),
  constraint nickname_reserved check (lower(nickname) !~ '(admin|administrator|operator|system|root|운영자|관리자|운영진|어디서봐|공식)')
);

-- 대소문자 무시 중복 금지 (Abc = abc)
create unique index if not exists profiles_nickname_unique on public.profiles (lower(nickname));

-- updated_at 자동 갱신
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- 2) RLS: 본인 행만 읽기/생성/수정
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 3) 닉네임 사용 가능 여부 (다른 사람 프로필을 노출하지 않고 true/false 만 반환)
create or replace function public.is_nickname_available(p_nickname text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.profiles
    where lower(nickname) = lower(trim(p_nickname))
      and id is distinct from auth.uid()
  );
$$;
revoke all on function public.is_nickname_available(text) from public, anon;
grant execute on function public.is_nickname_available(text) to authenticated;

-- 4) 회원탈퇴: 본인 auth 계정 삭제 → profiles 는 cascade 로 즉시 삭제
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
