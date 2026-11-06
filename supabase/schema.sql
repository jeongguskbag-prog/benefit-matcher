-- 내게 맞는 지원금 · Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- 실명·주민번호·계좌·정확한 소득액은 저장하지 않습니다 (기획서 5.2, 8장).

-- 조건 프로필 (로그인 사용자 1명당 1행)
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,           -- 나이, 자치구, 가구원 수, 소득 구간, 자녀 출생연월, 상황 태그
  updated_at timestamptz not null default now()
);

-- 북마크 + 신청 체크리스트
create table if not exists public.saved_items (
  user_id      uuid not null references auth.users(id) on delete cascade,
  service_id   text not null,
  status       text not null check (status in ('saved', 'applied')),
  checked_docs text[] not null default '{}',
  updated_at   timestamptz not null default now(),
  primary key (user_id, service_id)
);

alter table public.profiles    enable row level security;
alter table public.saved_items enable row level security;

-- 본인 행만 읽기·쓰기
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own saved items" on public.saved_items;
create policy "own saved items" on public.saved_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 회원 탈퇴: 본인 계정 삭제 → cascade로 조건·북마크·체크리스트 즉시 삭제
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
