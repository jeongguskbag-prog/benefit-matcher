import { supabase } from './supabase';
import type { SavedItem, UserProfile } from '../types';

/**
 * 조건 프로필·북마크·체크리스트 저장소.
 * - 로그인 사용자: Supabase (RLS로 본인 행만 접근)
 * - 비로그인: 이 기기의 localStorage에만 저장 (기획서 8장)
 */
export interface Store {
  loadProfile(): Promise<UserProfile | null>;
  saveProfile(p: UserProfile): Promise<void>;
  loadSaved(): Promise<SavedItem[]>;
  saveItem(item: SavedItem): Promise<void>;
  removeItem(serviceId: string): Promise<void>;
  /** 조건·북마크·체크리스트 전부 삭제 */
  deleteAll(): Promise<void>;
}

const LS_PROFILE = 'bm.profile';
const LS_SAVED = 'bm.saved';

const readLS = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* 저장 불가 환경(사생활 보호 모드 등)에서는 메모리 상태만 유지 */
  }
};

export const localStore: Store = {
  async loadProfile() {
    return readLS<UserProfile | null>(LS_PROFILE, null);
  },
  async saveProfile(p) {
    writeLS(LS_PROFILE, p);
  },
  async loadSaved() {
    return readLS<SavedItem[]>(LS_SAVED, []);
  },
  async saveItem(item) {
    const all = readLS<SavedItem[]>(LS_SAVED, []).filter((x) => x.serviceId !== item.serviceId);
    writeLS(LS_SAVED, [...all, item]);
  },
  async removeItem(id) {
    writeLS(LS_SAVED, readLS<SavedItem[]>(LS_SAVED, []).filter((x) => x.serviceId !== id));
  },
  async deleteAll() {
    try {
      localStorage.removeItem(LS_PROFILE);
      localStorage.removeItem(LS_SAVED);
    } catch {
      /* noop */
    }
  },
};

export function remoteStore(userId: string): Store {
  const db = supabase!;
  return {
    async loadProfile() {
      const { data, error } = await db.from('profiles').select('data').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return (data?.data as UserProfile) ?? null;
    },
    async saveProfile(p) {
      const { error } = await db.from('profiles').upsert({ user_id: userId, data: p, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async loadSaved() {
      const { data, error } = await db.from('saved_items').select('service_id,status,checked_docs').eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({ serviceId: r.service_id, status: r.status, checkedDocs: r.checked_docs ?? [] }));
    },
    async saveItem(item) {
      const { error } = await db.from('saved_items').upsert({
        user_id: userId,
        service_id: item.serviceId,
        status: item.status,
        checked_docs: item.checkedDocs,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    async removeItem(id) {
      const { error } = await db.from('saved_items').delete().eq('user_id', userId).eq('service_id', id);
      if (error) throw error;
    },
    async deleteAll() {
      await db.from('saved_items').delete().eq('user_id', userId);
      await db.from('profiles').delete().eq('user_id', userId);
    },
  };
}
