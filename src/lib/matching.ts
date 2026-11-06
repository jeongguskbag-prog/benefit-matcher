import { INCOME_BANDS } from '../types';
import type { Bucket, MatchResult, Service, UserProfile, Verdict } from '../types';
import { districtName } from '../data/districts';

const INCOME_LABEL: Record<string, string> = {
  basic: '기초생활수급',
  near_poor: '차상위',
  m100: '중위소득 100% 이하',
  m150: '중위소득 150% 이하',
  m180: '중위소득 180% 이하',
  over: '중위소득 180% 초과',
};

/** 마감 임박 기준 (일) */
export const CLOSING_SOON_DAYS = 30;

/** 출생 연월(YYYY-MM)과 기준일로 경과 개월 수 */
export function monthsSince(birthMonth: string, today: Date): number {
  const [y, m] = birthMonth.split('-').map(Number);
  return (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysBetween = (from: Date, toIso: string) => {
  const [y, m, d] = toIso.split('-').map(Number);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86_400_000);
};

/**
 * 규칙 기반 매칭 (기획서 5.3 1단계).
 * 하나라도 명확히 불충족 → 제외, 판단 불가 조건이 있으면 → 확인 필요, 모두 충족 → 충족.
 */
export function matchService(service: Service, p: UserProfile, today: Date): MatchResult {
  const e = service.eligibility;
  const reasons: MatchResult['reasons'] = [];
  let fail = false;
  let unsure = false;

  if (e.ageMin !== undefined || e.ageMax !== undefined) {
    const ok = (e.ageMin === undefined || p.age >= e.ageMin) && (e.ageMax === undefined || p.age <= e.ageMax);
    const range = `만 ${e.ageMin ?? 0}세${e.ageMax !== undefined ? ` ~ ${e.ageMax}세` : ' 이상'}`;
    reasons.push({ ok, text: `나이 ${range} (입력: 만 ${p.age}세)` });
    if (!ok) fail = true;
  }

  const districtOk = !e.districtCodes || e.districtCodes.includes(p.districtCode);
  reasons.push({ ok: districtOk, text: `거주지: ${districtName(p.districtCode)}` });
  if (!districtOk) fail = true;

  let dueDate: string | null = null;
  if (e.childMonthsMin !== undefined || e.childMonthsMax !== undefined) {
    const min = e.childMonthsMin ?? 0;
    const max = e.childMonthsMax ?? Infinity;
    const inRange = p.childBirthMonths.filter((b) => {
      const m = monthsSince(b, today);
      return m >= min && m <= max;
    });
    const ok = inRange.length > 0;
    reasons.push({ ok, text: `대상 연령 자녀 (출생 후 ${min}~${max}개월)${ok ? '' : ' 없음'}` });
    if (!ok) fail = true;

    if (ok && service.deadline.kind === 'after_birth') {
      // 가장 최근에 태어난 대상 자녀 기준. 출생일은 연월만 받으므로 그 달 1일로 보수적으로 계산.
      const youngest = [...inRange].sort()[inRange.length - 1];
      const [y, m] = youngest.split('-').map(Number);
      const due = new Date(y, m - 1, 1 + service.deadline.days - 1);
      dueDate = toISO(due);
    }
  }

  for (const tag of e.requiresTags ?? []) {
    const ok = p.tags.includes(tag);
    reasons.push({ ok, text: `${TAG_LABEL[tag]}${ok ? '' : ' 해당 없음'}` });
    if (!ok) fail = true;
  }

  if (e.incomeMax) {
    const limit = INCOME_BANDS.indexOf(e.incomeMax);
    if (p.incomeBand === 'unknown') {
      unsure = true;
      reasons.push({ ok: null, text: `소득 ${INCOME_LABEL[e.incomeMax]} (입력하지 않음)` });
    } else if (INCOME_BANDS.indexOf(p.incomeBand) <= limit) {
      reasons.push({ ok: true, text: `소득 ${INCOME_LABEL[e.incomeMax]}` });
    } else if (e.incomeBypassTags?.some((t) => p.tags.includes(t))) {
      unsure = true;
      reasons.push({ ok: null, text: `소득 기준 초과지만 ${e.incomeBypassTags.map((t) => TAG_LABEL[t]).join('·')} 예외 확인 필요` });
    } else {
      fail = true;
      reasons.push({ ok: false, text: `소득 ${INCOME_LABEL[e.incomeMax]} 대상 (입력: ${INCOME_LABEL[p.incomeBand]})` });
    }
  }

  for (const c of e.manualChecks ?? []) {
    unsure = true;
    reasons.push({ ok: null, text: c });
  }

  if (service.deadline.kind === 'fixed') dueDate = service.deadline.date;

  let verdict: Verdict = fail ? 'ineligible' : unsure ? 'check' : 'eligible';
  // 기한이 이미 지났으면 제외
  if (verdict !== 'ineligible' && dueDate && daysBetween(today, dueDate) < 0) {
    verdict = 'ineligible';
    reasons.push({ ok: false, text: `신청 기한(${dueDate})이 지났어요` });
  }

  let bucket: Bucket | null = null;
  if (verdict !== 'ineligible') {
    if (dueDate && daysBetween(today, dueDate) <= CLOSING_SOON_DAYS) bucket = 'closing';
    else if (verdict === 'check') bucket = 'check';
    else bucket = 'now';
  }

  return { service, verdict, bucket, reasons, dueDate };
}

export function matchAll(services: Service[], p: UserProfile, today = new Date()): MatchResult[] {
  return services
    .map((s) => matchService(s, p, today))
    .filter((r) => r.verdict !== 'ineligible')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
}

export const daysLeft = (dueDate: string, today = new Date()) => daysBetween(today, dueDate);

export const TAG_LABEL: Record<string, string> = {
  pregnant: '임신 중',
  disabled: '장애가 있음',
  unemployed: '실직·구직 중',
  single_parent: '한부모 가정',
  renter: '무주택 월세·전세',
};

export { INCOME_LABEL };
