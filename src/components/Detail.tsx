import type { MatchResult, SavedItem } from '../types';
import { DueBadge } from './Results';

export function Detail({
  result,
  saved,
  onBack,
  onSave,
  onRemove,
}: {
  result: MatchResult;
  saved: SavedItem | undefined;
  onBack: () => void;
  onSave: (item: SavedItem) => void;
  onRemove: () => void;
}) {
  const s = result.service;
  const checked = saved?.checkedDocs ?? [];
  const pct = Math.round((checked.length / s.requiredDocs.length) * 100);

  const toggleDoc = (doc: string) => {
    const next = checked.includes(doc) ? checked.filter((d) => d !== doc) : [...checked, doc];
    onSave({ serviceId: s.id, status: saved?.status ?? 'saved', checkedDocs: next });
  };

  return (
    <article className="detail">
      <button className="link back" onClick={onBack}>
        ← 목록으로
      </button>
      <div className="card-top">
        <span className="category">{s.category}</span>
        <span className="category">{s.level}</span>
        <DueBadge dueDate={result.dueDate} />
      </div>
      <h2>{s.name}</h2>
      <p className="lead">{s.benefitSummary}</p>

      <div className={`verdict ${result.verdict}`}>
        {result.verdict === 'eligible'
          ? '입력한 조건상 신청 대상일 가능성이 있습니다.'
          : '일부 조건은 직접 확인이 필요합니다.'}
        <small>최종 자격은 신청 기관이 판단합니다.</small>
      </div>

      <h3>판정 근거</h3>
      <ul className="reasons">
        {result.reasons.map((r, i) => (
          <li key={i} className={r.ok === null ? 'unknown' : r.ok ? 'ok' : 'no'}>
            <span aria-hidden>{r.ok === null ? '?' : r.ok ? '✓' : '✕'}</span>
            {r.ok === null ? '확인 필요: ' : ''}
            {r.text}
          </li>
        ))}
      </ul>

      <h3>누가 받을 수 있나요</h3>
      <ul className="plain">
        {s.plainEligibility.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <h3>신청 방법</h3>
      <ol className="plain">
        {s.howToApply.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      {s.deadline.kind === 'after_birth' && <p className="hint">⏰ {s.deadline.note}</p>}
      {s.deadline.kind === 'announcement' && <p className="hint">⏰ {s.deadline.note}</p>}
      {s.contact && (
        <p>
          문의: <strong>{s.contact}</strong>
        </p>
      )}

      <h3>
        필요 서류 체크리스트 <span className="count">{pct}%</span>
      </h3>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <ul className="checklist">
        {s.requiredDocs.map((d) => (
          <li key={d}>
            <label>
              <input type="checkbox" checked={checked.includes(d)} onChange={() => toggleDoc(d)} />
              {d}
            </label>
          </li>
        ))}
      </ul>

      <div className="actions sticky">
        {saved ? (
          <>
            <button className="btn secondary" onClick={onRemove}>
              저장 취소
            </button>
            <button
              className="btn primary"
              onClick={() => onSave({ ...saved, status: saved.status === 'applied' ? 'saved' : 'applied' })}
            >
              {saved.status === 'applied' ? '신청 완료 취소' : '신청 완료로 표시'}
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={() => onSave({ serviceId: s.id, status: 'saved', checkedDocs: [] })}>
            저장하고 마감 알림 받기
          </button>
        )}
      </div>

      <a className="btn outline full" href={s.applyUrl} target="_blank" rel="noreferrer">
        공식 페이지에서 원문 확인 ↗
      </a>
      <p className="source">
        자료 기준: {s.sourceUpdatedAt} · 수집일 {s.fetchedAt}
      </p>
    </article>
  );
}
