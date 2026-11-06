import { describe, expect, it } from 'vitest';
import { matchAll, matchService, monthsSince } from './matching';
import { getService, SERVICES } from '../data/services';
import type { UserProfile } from '../types';

const TODAY = new Date(2026, 10, 6); // 2026-11-06

const base: UserProfile = {
  age: 34,
  districtCode: '11440',
  householdSize: 3,
  incomeBand: 'm150',
  childBirthMonths: [],
  tags: [],
};

const ids = (p: UserProfile) => matchAll(SERVICES, p, TODAY).map((r) => r.service.id);

describe('monthsSince', () => {
  it('같은 달은 0개월', () => expect(monthsSince('2026-11', TODAY)).toBe(0));
  it('작년 같은 달은 12개월', () => expect(monthsSince('2025-11', TODAY)).toBe(12));
});

describe('matchService', () => {
  it('신생아 가정: 부모급여는 충족, 산후조리경비는 마감 임박', () => {
    const p = { ...base, childBirthMonths: ['2026-10'] };
    const parent = matchService(getService('parent-allowance')!, p, TODAY);
    expect(parent.verdict).toBe('eligible');
    expect(parent.dueDate).toBe('2026-11-29');
    expect(parent.bucket).toBe('closing');

    const postpartum = matchService(getService('seoul-postpartum-care')!, p, TODAY);
    expect(postpartum.verdict).toBe('check'); // 거주 요건은 수동 확인
    expect(postpartum.bucket).toBe('closing');
  });

  it('출생 후 신청 기한이 지나면 제외', () => {
    const p = { ...base, childBirthMonths: ['2026-08'] }; // 산후조리경비 60일 경과
    const r = matchService(getService('seoul-postpartum-care')!, p, TODAY);
    expect(r.verdict).toBe('ineligible');
  });

  it('소득 기준 초과 → 제외, 한부모면 확인 필요, 미입력이면 확인 필요', () => {
    const svc = getService('diaper-formula')!;
    const p = { ...base, childBirthMonths: ['2026-03'] };
    expect(matchService(svc, p, TODAY).verdict).toBe('ineligible');
    expect(matchService(svc, { ...p, tags: ['single_parent'] }, TODAY).verdict).toBe('check');
    expect(matchService(svc, { ...p, incomeBand: 'unknown' }, TODAY).verdict).toBe('check');
    expect(matchService(svc, { ...p, incomeBand: 'near_poor' }, TODAY).verdict).toBe('eligible');
  });

  it('나이 범위', () => {
    const svc = getService('seoul-youth-rent')!;
    expect(matchService(svc, { ...base, age: 29, tags: ['renter'] }, TODAY).verdict).toBe('check');
    expect(matchService(svc, { ...base, age: 40, tags: ['renter'] }, TODAY).verdict).toBe('ineligible');
  });
});

describe('matchAll', () => {
  it('자녀·상황 없는 30대는 육아·임신 혜택이 나오지 않음', () => {
    const r = ids(base);
    expect(r).not.toContain('parent-allowance');
    expect(r).not.toContain('pregnancy-medical-voucher');
  });

  it('임신 중이면 임신 관련 혜택 포함', () => {
    expect(ids({ ...base, tags: ['pregnant'] })).toEqual(
      expect.arrayContaining(['pregnancy-medical-voucher', 'seoul-pregnant-transport']),
    );
  });

  it('65세 이상은 기초연금 확인 필요', () => {
    const r = matchAll(SERVICES, { ...base, age: 70 }, TODAY).find((x) => x.service.id === 'basic-pension');
    expect(r?.verdict).toBe('check');
  });

  it('마감일이 빠른 순으로 정렬', () => {
    const r = matchAll(SERVICES, { ...base, childBirthMonths: ['2026-10'] }, TODAY);
    const dates = r.map((x) => x.dueDate ?? '9999');
    expect([...dates].sort()).toEqual(dates);
  });
});
