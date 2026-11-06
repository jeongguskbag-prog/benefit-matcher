import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase 환경변수가 없으면 null → 앱은 "체험 모드"(기기 저장)로 동작한다.
 * 카카오·구글·휴대폰(SMS) 로그인은 Supabase 대시보드에서 제공자를 켜야 한다 (README 참고).
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
