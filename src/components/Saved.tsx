import { getService } from '../data/services';
import type { MatchResult, SavedItem } from '../types';
import { DueBadge } from './Results';

export function Saved({
  saved,
  results,
  onOpen,
  notifyPermission,
  onEnableNotify,
}: {
  saved: SavedItem[];
  results: MatchResult[];
  onOpen: (id: string) => void;
  notifyPermission: NotificationPermission | 'unsupported';
  onEnableNotify: () => void;
}) {
  return (
    <section>
      <h2>저장한 지원</h2>
      {notifyPermission === 'default' && (
        <div className="notice">
          <p>마감 7일 전에 알림을 받을 수 있어요.</p>
          <button className="btn primary small" onClick={onEnableNotify}>
            알림 켜기
          </button>
        </div>
      )}
      {notifyPermission === 'denied' && <p className="hint">브라우저에서 알림이 차단되어 있어요. 앱 안에서만 마감을 표시합니다.</p>}

      {saved.length === 0 && <p className="empty">아직 저장한 지원이 없어요. 결과 목록에서 관심 있는 지원을 저장해 보세요.</p>}
      <ul className="cards">
        {saved.map((item) => {
          const s = getService(item.serviceId);
          if (!s) return null;
          const r = results.find((x) => x.service.id === s.id);
          const pct = Math.round((item.checkedDocs.length / s.requiredDocs.length) * 100);
          return (
            <li key={s.id}>
              <button className="card" onClick={() => onOpen(s.id)}>
                <div className="card-top">
                  <span className="category">{s.category}</span>
                  <DueBadge dueDate={r?.dueDate ?? null} />
                  {item.status === 'applied' && <span className="badge saved">신청 완료</span>}
                  {!r && <span className="badge muted">현재 조건과 맞지 않음</span>}
                </div>
                <h3>{s.name}</h3>
                <div className="bar small">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="provider">서류 준비 {pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
