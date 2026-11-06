# 내게 맞는 지원금 (서울) — MVP 프로토타입

나의 조건(나이·서울 자치구·가구·소득 구간·상황)을 입력하면 **신청 가능성이 있는 지원금**을 찾아 주고,
**필요 서류 체크리스트와 마감일**까지 한 화면에 정리해 주는 모바일 웹 앱(PWA)입니다.

> ⚠️ `src/data/services.ts`의 지원 정보는 화면·로직 시험용 **샘플 데이터**입니다.
> 실제 서비스 전에 복지로 오픈 API / 공공데이터포털 "서울시 복지서비스 목록"으로 교체하고 원문과 대조 검증해야 합니다.

## 기획서 기능 구현 현황

| # | 기능 | 상태 |
|---|---|---|
| F0 | 로그인 (카카오·구글·휴대폰 문자 인증) | ✅ Supabase Auth 연동 코드 완료. 키가 없으면 "체험 모드"(기기 저장) |
| F1 | 간편 조건 입력 (6단계) | ✅ 나이 → 자치구(25개) → 가구원 → 자녀 출생연월 → 상황 → 소득 구간(선택) |
| F2 | 매칭 결과 | ✅ "곧 마감 / 지금 신청 가능 / 조건 확인 필요" 분류, 마감 빠른 순 |
| F3 | 혜택 상세 | ✅ 쉬운 말 요건, **판정 근거**, 신청 방법, 문의처, 원문 링크 |
| F4 | 신청 체크리스트 | ✅ 서류 체크 + 진행률 |
| F5 | 북마크·신청 완료 표시 | ✅ |
| F6 | 마감 알림 | 🟡 앱을 열 때 7일 이내 마감 알림(시스템 알림, 하루 1회). 앱이 닫혀 있을 때의 서버 웹 푸시는 다음 단계 |

매칭은 규칙 기반입니다 (`src/lib/matching.ts`). 판단할 수 없는 조건(거주 기간, 재산 포함 소득인정액 등)은
"확인 필요"로 표시하고, 출생 후 N일 이내 신청해야 하는 지원은 **자녀 출생연월로 사용자별 마감일을 계산**합니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 매칭 로직 단위 테스트
npm run build      # dist/ 정적 파일 (Netlify·Vercel 등에 배포)
```

## 로그인 켜기 (Supabase)

1. Supabase 프로젝트 생성 → `supabase/schema.sql`을 SQL Editor에서 실행 (테이블, RLS, 회원 탈퇴 함수)
2. `.env.example`을 `.env`로 복사해 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 입력
3. Authentication → Providers에서 켜기
   - **Kakao**: 카카오 디벨로퍼스 앱의 REST API 키·Client Secret 입력, Redirect URI에 Supabase 콜백 주소 등록
   - **Google**: Google Cloud OAuth 클라이언트 ID/Secret 입력
   - **Phone**: SMS 발송 서비스(Twilio 등) 연결 — 한국 번호 단가·발송 품질 확인 필요 (기획서 12장)
4. Authentication → URL Configuration에 배포 주소를 Redirect URL로 추가

개인정보: 실명·주민번호·계좌·정확한 소득액은 받지 않습니다. 회원 탈퇴 시 `delete_my_account()`가 계정을 지우고
조건·저장 목록·체크리스트가 cascade로 즉시 삭제됩니다. 비로그인 사용 시 데이터는 이 기기에만 저장됩니다.

## 구조

```
src/
  types.ts               데이터 모델 (Service, UserProfile, SavedItem …)
  data/districts.ts      서울 25개 자치구
  data/services.ts       샘플 지원 서비스 12건 (교체 대상)
  lib/matching.ts        규칙 기반 매칭 + 마감일 계산 (+ matching.test.ts)
  lib/store.ts           저장소: localStorage / Supabase
  lib/notify.ts          마감 알림
  components/            Onboarding, Results, Detail, Saved, Account
supabase/schema.sql      DB 스키마·RLS
public/                  PWA manifest, service worker, 아이콘
```

## 다음 단계

- [ ] 복지로 오픈 API·서울시 복지서비스 목록 활용신청 → 수집 배치(주 1회)와 `services` 테이블로 이전
- [ ] 샘플 조건 30개 정확도 검증 (목표 오판율 5% 이하)
- [ ] 서버 웹 푸시 (VAPID + 스케줄러)
- [ ] 개인정보처리방침·이용약관, 공공데이터 출처 표시
