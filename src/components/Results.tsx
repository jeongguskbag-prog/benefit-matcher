import { daysLeft } from '../lib/matching';
import type { Bucket, MatchResult, SavedItem } from '../types';

const SECTIONS: { key: Bucket; title: string; desc: string }[] = [
  { key: 'closing', title: '곧 마감', desc: '30일 안에 신청 기한이 끝나요' },
  { key: 'now', title: '지금 신청 가능', desc: '입력한 조건을 모두 충족해요' },
  { key: 'check', title: '조건 확인 필요', desc: '앱이 판단할 수 없는 조건이 있어요' },
];

export function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const d = daysLeft(dueDate);
  return <span className={`badge ${d <= 7 ? 'urgent' : 'soon'}`}>{d === 0 ? '오늘 마감' : `D-${d}`}</span>;
}

export function Results({
  results,
  saved,
  onOpen,
  onEdit,
}: {
  results: MatchResult[];
  saved: SavedItem[];
  onOpen: (id: string) => void;
  onEdit: () => void;
}) {
  return (
    <section>
      <div className="summary">
        <p>
          조건상 신청 대상일 가능성이 있는 지원 <strong>{results.length}개</strong>를 찾았어요.
        </p>
        <button className="link" onClick={onEdit}>
          조건 수정
        </button>
      </div>

      {results.length === 0 && <p className="empty">조건에 맞는 지원을 찾지 못했어요. 조건을 바꿔 보세요.</p>}

      {SECTIONS.map(({ key, title, desc }) => {
        const items = results.filter((r) => r.bucket === key);
        if (!items.length) return null;
        return (
          <div key={key} className="group">
            <h2 className={`group-title ${key}`}>
              {title} <span className="count">{items.length}</span>
            </h2>
            <p className="hint">{desc}</p>
            <ul className="cards">
              {items.map((r) => {
                const s = saved.find((x) => x.serviceId === r.service.id);
                return (
                  <li key={r.service.id}>
                    <button className="card" onClick={() => onOpen(r.service.id)}>
                      <div className="card-top">
                        <span className="category">{r.service.category}</span>
                        <DueBadge dueDate={r.dueDate} />
                        {s && <span className="badge saved">{s.status === 'applied' ? '신청 완료' : '저장됨'}</span>}
                      </div>
                      <h3>{r.service.name}</h3>
                      <p>{r.service.benefitSummary}</p>
                      <span className="provider">{r.service.provider}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
