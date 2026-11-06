import { daysLeft } from './matching';
import type { MatchResult, SavedItem } from '../types';

/** 알림 기준: 마감 N일 이내 */
export const NOTIFY_DAYS = 7;
const LS_NOTIFIED = 'bm.notified';

export const notifyPermission = (): NotificationPermission | 'unsupported' =>
  'Notification' in window ? Notification.permission : 'unsupported';

/** 저장했지만 아직 신청하지 않은 혜택 중 마감 임박 목록 */
export function dueSoon(saved: SavedItem[], results: MatchResult[], today = new Date()) {
  return saved
    .filter((s) => s.status === 'saved')
    .map((s) => results.find((r) => r.service.id === s.serviceId))
    .filter((r): r is MatchResult => !!r?.dueDate && daysLeft(r.dueDate, today) <= NOTIFY_DAYS);
}

/**
 * MVP F6: 앱을 열 때 마감 임박 혜택을 시스템 알림으로 보여 준다 (하루 1회).
 * 앱이 닫혀 있을 때의 진짜 웹 푸시는 서버(스케줄러 + VAPID 키)가 필요하므로 다음 단계에서 붙인다.
 */
export async function notifyDueSoon(items: MatchResult[]) {
  if (notifyPermission() !== 'granted' || !items.length) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(LS_NOTIFIED) === today) return;
    localStorage.setItem(LS_NOTIFIED, today);
  } catch {
    /* noop */
  }
  const body = items.map((r) => `${r.service.name} (D-${daysLeft(r.dueDate!)})`).join(', ');
  const reg = await navigator.serviceWorker?.getRegistration();
  const title = '신청 마감이 다가오는 지원이 있어요';
  if (reg) reg.showNotification(title, { body, icon: '/icon.svg' });
  else new Notification(title, { body });
}
