import { useState } from 'react';
import { SEOUL_DISTRICTS } from '../data/districts';
import { INCOME_LABEL, TAG_LABEL } from '../lib/matching';
import { INCOME_BANDS } from '../types';
import type { IncomeBand, SituationTag, UserProfile } from '../types';

const EMPTY: UserProfile = {
  age: 0,
  districtCode: '',
  householdSize: 0,
  incomeBand: 'unknown',
  childBirthMonths: [],
  tags: [],
};

const STEPS = ['나이', '사는 곳', '가구원 수', '자녀', '상황', '소득'];

export function Onboarding({ initial, onDone }: { initial: UserProfile | null; onDone: (p: UserProfile) => void }) {
  const [p, setP] = useState<UserProfile>(initial ?? EMPTY);
  const [step, setStep] = useState(0);
  const [childInput, setChildInput] = useState('');
  const set = (patch: Partial<UserProfile>) => setP((x) => ({ ...x, ...patch }));

  const valid = [
    p.age > 0 && p.age < 120,
    p.districtCode !== '',
    p.householdSize > 0,
    true,
    true,
    true,
  ][step];

  const next = () => (step === STEPS.length - 1 ? onDone(p) : setStep(step + 1));

  return (
    <section className="onboarding">
      <div className="progress" aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <p className="step-label">
        {step + 1} / {STEPS.length} · {STEPS[step]}
      </p>

      {step === 0 && (
        <>
          <h2>만 나이를 알려 주세요</h2>
          <input
            className="big-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={119}
            placeholder="예: 34"
            value={p.age || ''}
            onChange={(e) => set({ age: Number(e.target.value) })}
            autoFocus
          />
        </>
      )}

      {step === 1 && (
        <>
          <h2>서울 어느 구에 사세요?</h2>
          <p className="hint">지금은 서울특별시만 지원해요.</p>
          <div className="chip-grid">
            {SEOUL_DISTRICTS.map((d) => (
              <button
                key={d.code}
                className={`chip ${p.districtCode === d.code ? 'selected' : ''}`}
                onClick={() => set({ districtCode: d.code })}
                aria-pressed={p.districtCode === d.code}
              >
                {d.name}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2>함께 사는 가족은 모두 몇 명인가요?</h2>
          <p className="hint">본인을 포함해 주세요.</p>
          <div className="chip-grid wide">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                className={`chip ${p.householdSize === n ? 'selected' : ''}`}
                onClick={() => set({ householdSize: n })}
                aria-pressed={p.householdSize === n}
              >
                {n === 6 ? '6명 이상' : `${n}명`}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2>자녀가 있다면 태어난 달을 알려 주세요</h2>
          <p className="hint">출생 후 기한이 있는 지원금의 마감일을 계산하는 데 써요. 자녀가 없으면 넘어가세요.</p>
          <div className="row">
            <input
              className="big-input"
              type="month"
              value={childInput}
              max={new Date().toISOString().slice(0, 7)}
              onChange={(e) => setChildInput(e.target.value)}
              aria-label="자녀 출생 연월"
            />
            <button
              className="btn secondary"
              disabled={!childInput}
              onClick={() => {
                set({ childBirthMonths: [...p.childBirthMonths, childInput].sort() });
                setChildInput('');
              }}
            >
              추가
            </button>
          </div>
          <ul className="tag-list">
            {p.childBirthMonths.map((b, i) => (
              <li key={`${b}-${i}`}>
                {b.replace('-', '년 ')}월생
                <button
                  aria-label={`${b} 자녀 삭제`}
                  onClick={() => set({ childBirthMonths: p.childBirthMonths.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {step === 4 && (
        <>
          <h2>해당하는 상황을 모두 골라 주세요</h2>
          <p className="hint">없으면 그냥 다음으로 넘어가세요.</p>
          <div className="chip-grid wide">
            {(Object.keys(TAG_LABEL) as SituationTag[]).map((t) => {
              const on = p.tags.includes(t);
              return (
                <button
                  key={t}
                  className={`chip ${on ? 'selected' : ''}`}
                  aria-pressed={on}
                  onClick={() => set({ tags: on ? p.tags.filter((x) => x !== t) : [...p.tags, t] })}
                >
                  {TAG_LABEL[t]}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h2>소득 구간을 골라 주세요 (선택)</h2>
          <p className="hint">
            정확한 금액은 묻지 않아요. 잘 모르면 "모름"을 고르세요. 소득 조건이 있는 혜택은 "조건 확인 필요"로 보여 드려요.
          </p>
          <div className="chip-grid wide">
            {[...INCOME_BANDS, 'unknown' as const].map((b) => (
              <button
                key={b}
                className={`chip ${p.incomeBand === b ? 'selected' : ''}`}
                aria-pressed={p.incomeBand === b}
                onClick={() => set({ incomeBand: b as IncomeBand | 'unknown' })}
              >
                {b === 'unknown' ? '모름' : INCOME_LABEL[b]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="actions">
        {step > 0 && (
          <button className="btn secondary" onClick={() => setStep(step - 1)}>
            이전
          </button>
        )}
        <button className="btn primary" disabled={!valid} onClick={next}>
          {step === STEPS.length - 1 ? '지원금 찾기' : '다음'}
        </button>
      </div>
    </section>
  );
}
