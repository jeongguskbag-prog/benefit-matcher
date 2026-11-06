// 최소 서비스 워커: 설치 가능(PWA) + 알림 클릭 시 앱 열기.
// 오프라인 캐시·서버 웹 푸시는 다음 단계에서 추가.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('/'))));
});
