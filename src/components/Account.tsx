import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** 한국 휴대폰 번호(010-1234-5678) → E.164(+821012345678) */
const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('0') ? `+82${digits.slice(1)}` : `+${digits}`;
};

export function Account({
  session,
  onDeleteData,
}: {
  session: Session | null;
  onDeleteData: () => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async (fn: () => Promise<{ error: { message: string } | null }>) => {
    setMsg('');
    const { error } = await fn();
    if (error) setMsg(error.message);
  };

  if (!supabase) {
    return (
      <section>
        <h2>내 정보</h2>
        <div className="notice">
          <p>
            <strong>체험 모드</strong>로 실행 중이에요. 입력한 조건과 저장 목록은 이 기기에만 저장됩니다.
          </p>
          <p className="hint">
            로그인(카카오·구글·휴대폰)을 쓰려면 <code>.env</code>에 Supabase 키를 넣어 주세요. (README 참고)
          </p>
        </div>
        <button className="btn outline full" onClick={onDeleteData}>
          이 기기의 내 조건·저장 목록 모두 삭제
        </button>
      </section>
    );
  }

  if (session) {
    const u = session.user;
    return (
      <section>
        <h2>내 정보</h2>
        <p>
          {u.phone ? `휴대폰 ${u.phone}` : (u.email ?? '로그인됨')} · {u.app_metadata.provider ?? ''} 로그인
        </p>
        <p className="hint">조건과 저장 목록이 계정에 저장되어 기기가 바뀌어도 그대로 유지돼요.</p>
        <button className="btn secondary full" onClick={() => supabase!.auth.signOut()}>
          로그아웃
        </button>
        <button
          className="btn danger full"
          onClick={async () => {
            if (!confirm('탈퇴하면 조건·저장 목록·체크리스트가 모두 즉시 삭제됩니다. 계속할까요?')) return;
            const { error } = await supabase!.rpc('delete_my_account');
            if (error) return setMsg(error.message);
            await supabase!.auth.signOut();
          }}
        >
          회원 탈퇴
        </button>
        {msg && <p className="error">{msg}</p>}
      </section>
    );
  }

  const redirectTo = window.location.origin + window.location.pathname;
  return (
    <section>
      <h2>로그인</h2>
      <p className="hint">로그인하면 조건과 저장 목록이 계정에 보관돼요. 실명·주민번호는 받지 않아요.</p>
      <button
        className="btn kakao full"
        onClick={() => run(() => supabase!.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } }))}
      >
        카카오로 시작하기
      </button>
      <button
        className="btn google full"
        onClick={() => run(() => supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }))}
      >
        Google로 시작하기
      </button>

      <h3>휴대폰 번호로 시작하기</h3>
      {!sent ? (
        <div className="row">
          <input
            className="big-input"
            type="tel"
            inputMode="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            className="btn secondary"
            disabled={phone.replace(/\D/g, '').length < 10}
            onClick={() =>
              run(async () => {
                const r = await supabase!.auth.signInWithOtp({ phone: toE164(phone) });
                if (!r.error) setSent(true);
                return r;
              })
            }
          >
            인증번호 받기
          </button>
        </div>
      ) : (
        <div className="row">
          <input
            className="big-input"
            inputMode="numeric"
            placeholder="인증번호 6자리"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="btn primary"
            disabled={code.length < 4}
            onClick={() => run(() => supabase!.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' }))}
          >
            확인
          </button>
        </div>
      )}
      <p className="hint">휴대폰 번호는 로그인 확인 용도로만 쓰고 마케팅에 사용하지 않아요.</p>
      {msg && <p className="error">{msg}</p>}
    </section>
  );
}
