@AGENTS.md

# KH Music 연습실 예약 (academy-booking)

## 배포 & 저장소
- **URL**: khmusic-booking.vercel.app
- **GitHub**: noid80-cmd/khmusic-booking
- **플랫폼**: Vercel
- **commit/push는 허락 없이 바로 진행**

## 기술 스택
- Next.js App Router (TypeScript)
- Supabase (auth + DB)
- Tailwind CSS (주의: production에서 purge 이슈 있음 → 중요한 스타일은 inline style 사용)

## 서비스 개요
KH Music & Studio 연습실 예약 시스템 (PWA)

### 사용자 흐름
1. 회원가입 신청 (`/signup`) → 관리자 승인 대기 (`/pending`)
2. 승인 후 예약 페이지 (`/book`) 이용
3. 관리자(`/admin`)가 회원 승인/거절, 수업 일정 관리, 방 잠금

### 인증
- 이메일/비밀번호 + Google OAuth
- `accounts` 테이블의 `status`로 승인 여부 관리
- 관리자: `admins` 테이블에 등록된 이메일/user_id
- 최고 관리자: `noid80@hanmail.net` (삭제 불가)

## 주요 페이지
```
/           홈 (로그인 상태면 /book으로 리다이렉트)
/login      로그인 (이메일 + Google)
/signup     회원가입 신청
/signup/complete  구글 로그인 후 추가정보 입력
/pending    승인 대기 안내
/book       연습실 예약 (시간표 그리드)
/admin      관리자 페이지 (회원/본관수업/별관/방잠금)
/qr         QR 코드 페이지
/auth/callback  OAuth 콜백
/auth/reset     비밀번호 재설정
```

## 주요 Supabase 테이블
- `accounts` — 회원 정보 (name, phone, student_type, status)
- `admins` — 관리자 목록 (email, user_id)
- `rooms` — 연습실 (building: main/annex, name, is_locked, lock_until)
- `bookings` — 예약 (account_id, room_id, date, start_hour, end_hour, booking_type)
- `class_schedules` — 수업 일정 (반복 수업, template 저장/불러오기 지원)

## 주요 타입 (`lib/supabase.ts`)
- `StudentType`: `'exam' | 'audition' | 'professional' | 'hobby' | 'admin'`
- `AccountStatus`: `'pending' | 'approved' | 'rejected'`
- `Building`: `'main' | 'annex'`
- `BookingType`: `'student' | 'external' | 'monthly' | 'blocked'`

## 어드민 페이지 구조 (`/admin`)
탭 4개:
- **회원** — 승인 대기(pending) + 승인된 회원 목록, 관리자 지정/해제
- **본관 수업** — pianoRooms(P1~P13) + otherMainRooms 그리드, 기본 저장/불러오기
- **별관** — annexRooms 그리드, 날짜별 예약 등록/삭제
- **방 잠금** — 방별 시간대/기간 잠금

## 예약 페이지 (`/book`) 구조
- sticky 헤더: 본관/별관 탭 + 날짜 피커
- 시간 그리드 (11~21시)
- 범례: 예약 가능 / 내 예약 / 예약됨 / 수업 (`paddingLeft: 39` — 시간 컬럼 너비에 맞춤)
- 그리드 컬럼: `minmax(48px, 1fr)`

## PWA 설정
- `app/apple-icon.png` — iOS 홈화면 아이콘 (원본 logo.png 복사)
- 앱 이름: `연습실예약`
- theme color: `#6366f1`

## 방 명칭 약어 규칙
- PIANO → P, MIDI → M, GUITAR & BASS → G&B, ENSEMBLE ROOM → ENS, DRUMS → DR
