// 핵심 데이터 모델 (기획서 5.2 기준)

/** 상황 태그 */
export type SituationTag =
  | 'pregnant' // 임신 중
  | 'disabled' // 장애
  | 'unemployed' // 실직·구직 중
  | 'single_parent' // 한부모
  | 'renter'; // 무주택 임차(월세·전세)

/**
 * 소득 구간 (기준 중위소득 대비). 정확한 소득액은 수집하지 않는다.
 * 순서가 곧 낮은 소득 → 높은 소득 순위다.
 */
export const INCOME_BANDS = [
  'basic', // 기초생활수급
  'near_poor', // 차상위 (중위 50% 이하)
  'm100', // 중위 100% 이하
  'm150', // 중위 150% 이하
  'm180', // 중위 180% 이하
  'over', // 그 이상
] as const;
export type IncomeBand = (typeof INCOME_BANDS)[number];

export interface UserProfile {
  age: number; // 만 나이
  districtCode: string; // 서울 자치구 코드
  householdSize: number;
  incomeBand: IncomeBand | 'unknown';
  /** 자녀 출생 연월 (YYYY-MM). 출생 후 경과 개월 계산용 */
  childBirthMonths: string[];
  tags: SituationTag[];
}

export interface Eligibility {
  ageMin?: number;
  ageMax?: number;
  /** 자녀 중 한 명 이상이 이 개월 범위(경과 개월 수)에 있어야 함 */
  childMonthsMin?: number;
  childMonthsMax?: number;
  /** 모두 충족해야 하는 상황 태그 */
  requiresTags?: SituationTag[];
  /** 이 소득 구간 이하만 대상 */
  incomeMax?: IncomeBand;
  /** 소득 조건을 넘더라도 이 태그가 있으면 '확인 필요'로 판정 */
  incomeBypassTags?: SituationTag[];
  /** 적용 자치구 (없으면 서울 전체) */
  districtCodes?: string[];
  /** 앱이 판정할 수 없는 조건 → 항상 '확인 필요' 근거로 표시 */
  manualChecks?: string[];
}

export type DeadlineRule =
  | { kind: 'always' } // 상시
  | { kind: 'fixed'; date: string } // 공고 기간 (YYYY-MM-DD 마감)
  | { kind: 'after_birth'; days: number; note: string } // 출생일 기준 N일 이내
  | { kind: 'announcement'; note: string }; // 공고 시기 확인 필요

export interface Service {
  id: string;
  name: string;
  provider: string;
  level: '중앙' | '광역' | '기초';
  category: '임신·출산' | '육아' | '청년' | '노년' | '고용' | '장애';
  benefitSummary: string;
  /** 지원 대상 요건을 쉬운 말로 */
  plainEligibility: string[];
  eligibility: Eligibility;
  howToApply: string[];
  applyUrl: string;
  contact?: string;
  requiredDocs: string[];
  deadline: DeadlineRule;
  sourceUpdatedAt: string;
  fetchedAt: string;
}

export type Verdict = 'eligible' | 'check' | 'ineligible';
export type Bucket = 'now' | 'closing' | 'check';

export interface MatchResult {
  service: Service;
  verdict: Verdict;
  bucket: Bucket | null;
  /** 판정 근거 */
  reasons: { ok: boolean | null; text: string }[];
  /** 이 사용자 기준 계산된 마감일 (있을 때) */
  dueDate: string | null;
}

export type SavedStatus = 'saved' | 'applied';
export interface SavedItem {
  serviceId: string;
  status: SavedStatus;
  checkedDocs: string[];
}
