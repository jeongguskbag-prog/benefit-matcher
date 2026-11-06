import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SERVICES } from './data/services';
import { matchAll, matchService } from './lib/matching';
import { supabase } from './lib/supabase';
import { localStore, remoteStore, type Store } from './lib/store';
import { dueSoon, notifyDueSoon, notifyPermission } from './lib/notify';
import { getService } from './data/services';
import type { SavedItem, UserProfile } from './types';
import { Onboarding } from './components/Onboarding';
import { Results } from './components/Results';
import { Detail } from './components/Detail';
import { Saved } from './components/Saved';
import { Account } from './components/Account';

type View = { name: 'onboarding' } | { name: Tab } | { name: 'detail'; id: string; from: Tab };
type Tab = 'results' | 'saved' | 'account';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [view, setView] = useState<View>({ name: 'onboarding' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [perm, setPerm] = useState(notifyPermission());

  const store: Store = useMemo(() => (session ? remoteStore(session.user.id) : localStore), [session]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // 저장소가 바뀌면(로그인/로그아웃) 다시 불러온다. 첫 로그인 시 기기에 있던 조건은 계정으로 옮긴다.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let p = await store.loadProfile();
        let s = await store.loadSaved();
        if (session && !p) {
          const lp = await localStore.loadProfile();
          if (lp) {
            await store.saveProfile(lp);
            for (const item of await localStore.loadSaved()) await store.saveItem(item);
            await localStore.deleteAll();
            p = lp;
            s = await store.loadSaved();
          }
        }
        if (!alive) return;
        setProfile(p);
        setSaved(s);
        setView((v) => (v.name === 'onboarding' && p ? { name: 'results' } : v));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store, session]);

  const results = useMemo(() => (profile ? matchAll(SERVICES, profile) : []), [profile]);
  const urgent = useMemo(() => dueSoon(saved, results), [saved, results]);

  useEffect(() => {
    notifyDueSoon(urgent);
  }, [urgent]);

  const saveItem = useCallback(
    async (item: SavedItem) => {
      setSaved((xs) => [...xs.filter((x) => x.serviceId !== item.serviceId), item]);
      await store.saveItem(item).catch((e) => setError(String(e.message ?? e)));
    },
    [store],
  );
  const removeItem = useCallback(
    async (id: string) => {
      setSaved((xs) => xs.filter((x) => x.serviceId !== id));
      await store.removeItem(id).catch((e) => setError(String(e.message ?? e)));
    },
    [store],
  );

  const tab: Tab | null = view.name === 'detail' ? view.from : view.name === 'onboarding' ? null : view.name;

  let body: React.ReactNode;
  if (loading) body = <p className="empty">불러오는 중…</p>;
  else if (view.name === 'onboarding')
    body = (
      <Onboarding
        initial={profile}
        onDone={async (p) => {
          setProfile(p);
          setView({ name: 'results' });
          await store.saveProfile(p).catch((e) => setError(String(e.message ?? e)));
        }}
      />
    );
  else if (view.name === 'results')
    body = <Results results={results} saved={saved} onOpen={(id) => setView({ name: 'detail', id, from: 'results' })} onEdit={() => setView({ name: 'onboarding' })} />;
  else if (view.name === 'detail') {
    const svc = getService(view.id)!;
    const r = results.find((x) => x.service.id === view.id) ?? matchService(svc, profile!, new Date());
    body = (
      <Detail
        result={r}
        saved={saved.find((x) => x.serviceId === view.id)}
        onBack={() => setView({ name: view.from })}
        onSave={saveItem}
        onRemove={() => removeItem(view.id)}
      />
    );
  } else if (view.name === 'saved')
    body = (
      <Saved
        saved={saved}
        results={results}
        onOpen={(id) => setView({ name: 'detail', id, from: 'saved' })}
        notifyPermission={perm}
        onEnableNotify={async () => setPerm(await Notification.requestPermission())}
      />
    );
  else
    body = (
      <Account
        session={session}
        onDeleteData={async () => {
          if (!confirm('이 기기에 저장된 조건과 저장 목록을 모두 삭제할까요?')) return;
          await localStore.deleteAll();
          setProfile(null);
          setSaved([]);
          setView({ name: 'onboarding' });
        }}
      />
    );

  return (
    <div className="app">
      <header>
        <h1>내게 맞는 지원금</h1>
        <span className="region">서울</span>
      </header>

      {urgent.length > 0 && tab && (
        <button className="alert" onClick={() => setView({ name: 'saved' })}>
          ⏰ 저장한 지원 중 {urgent.length}개가 7일 안에 마감돼요
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error} <button className="link" onClick={() => setError('')}>닫기</button>
        </p>
      )}

      <main>{body}</main>

      <footer className="disclaimer">
        본 서비스는 정보 안내용이며, 최종 자격은 신청 기관 판단에 따릅니다. 현재 표시되는 지원 정보는 프로토타입용 샘플 데이터로, 반드시 공식 원문을 확인하세요.
      </footer>

      {tab && (
        <nav className="tabs">
          {(
            [
              ['results', '찾은 지원'],
              ['saved', `저장함${saved.length ? ` ${saved.length}` : ''}`],
              ['account', session ? '내 정보' : '로그인'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setView({ name: k })}>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
