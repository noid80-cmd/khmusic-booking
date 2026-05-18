-- 계정 테이블
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  name text not null,
  phone text,
  student_type text check (student_type in ('exam', 'professional', 'hobby')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- 연습실 테이블
create table rooms (
  id uuid primary key default gen_random_uuid(),
  building text not null check (building in ('main', 'annex')),
  name text not null,
  display_order int not null,
  is_active boolean default true
);

-- 수업 스케줄 (본관만, 관리자가 입력)
create table class_schedules (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  date date not null,
  start_hour int not null check (start_hour >= 11 and start_hour <= 21),
  end_hour int not null check (end_hour >= 12 and end_hour <= 22),
  instructor text not null,
  created_at timestamptz default now()
);

-- 예약 테이블
create table bookings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete set null,
  room_id uuid references rooms(id) on delete cascade,
  date date not null,
  start_hour int not null check (start_hour >= 11 and start_hour <= 21),
  end_hour int not null check (end_hour >= 12 and end_hour <= 22),
  booking_type text not null default 'student' check (booking_type in ('student', 'external', 'monthly')),
  external_name text,
  note text,
  created_at timestamptz default now(),
  unique(room_id, date, start_hour)
);

-- RLS
alter table accounts enable row level security;
alter table rooms enable row level security;
alter table class_schedules enable row level security;
alter table bookings enable row level security;

create policy "accounts: 본인만 조회" on accounts for select using (auth.uid() = user_id);
create policy "accounts: 본인만 수정" on accounts for update using (auth.uid() = user_id);
create policy "accounts: 가입 시 생성" on accounts for insert with check (auth.uid() = user_id);
create policy "rooms: 모두 조회" on rooms for select using (true);
create policy "class_schedules: 모두 조회" on class_schedules for select using (true);
create policy "bookings: 모두 조회" on bookings for select using (true);
create policy "bookings: 로그인 시 생성" on bookings for insert with check (auth.uid() is not null);
create policy "bookings: 본인 예약 취소" on bookings for delete using (
  account_id in (select id from accounts where user_id = auth.uid())
);

-- 연습실 기본 데이터 삽입 (본관)
insert into rooms (building, name, display_order) values
  ('main', 'PIANO 1', 1), ('main', 'PIANO 2', 2), ('main', 'PIANO 3', 3),
  ('main', 'PIANO 4', 4), ('main', 'PIANO 5', 5), ('main', 'PIANO 6', 6),
  ('main', 'PIANO 7', 7), ('main', 'PIANO 8', 8), ('main', 'PIANO 9', 9),
  ('main', 'PIANO 10', 10), ('main', 'PIANO 11', 11), ('main', 'PIANO 12', 12),
  ('main', 'PIANO 13', 13),
  ('main', 'MIDI 1', 14), ('main', 'MIDI 2', 15), ('main', 'MIDI 3', 16), ('main', 'MIDI 4', 17),
  ('main', 'GUITAR & BASS 1', 18), ('main', 'GUITAR & BASS 2', 19), ('main', 'GUITAR & BASS 3', 20),
  ('main', 'DRUMS 1', 21), ('main', 'DRUMS 2', 22),
  ('main', '소극장', 23), ('main', '녹음실', 24), ('main', 'ENSEMBLE ROOM', 25);

-- 연습실 기본 데이터 삽입 (별관)
insert into rooms (building, name, display_order) values
  ('annex', 'PIANO 1', 1), ('annex', 'PIANO 2', 2), ('annex', 'PIANO 3', 3),
  ('annex', 'PIANO 4', 4), ('annex', 'PIANO 5', 5), ('annex', 'PIANO 6', 6),
  ('annex', 'PIANO 7', 7), ('annex', 'PIANO 8', 8), ('annex', 'PIANO 9', 9),
  ('annex', 'PIANO 10', 10), ('annex', 'PIANO 11', 11), ('annex', 'PIANO 12', 12),
  ('annex', 'PIANO 13', 13),
  ('annex', 'GUITAR & BASS 14', 14), ('annex', 'GUITAR & BASS 15', 15);
