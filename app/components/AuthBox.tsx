"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";
import { AVATARS_BUCKET, publicStorageUrl } from "@/lib/media";

type Props = { lang?: string; initialEmail?: string; redirectAfterLogin?: string; forceLoginForm?: boolean };

export default function AuthBox({ lang, initialEmail = "", redirectAfterLogin, forceLoginForm = false }: Props) {
  const params = useParams<{ lang?: string }>();
  const L = useMemo(() => safeLang(lang ?? params?.lang), [lang, params]);
  const t = useMemo(() => getT(L), [L]);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [rememberedProfile, setRememberedProfile] = useState<{ username: string | null; avatar_path: string | null } | null>(null);

  useEffect(() => {
    const loadRemembered = async (session: any) => {
      setUserEmail(session?.user?.email ?? null);
      if (!session?.user?.id || localStorage.getItem("simple-market:session-mode") !== "remembered") return setRememberedProfile(null);
      const { data } = await supabase.from("profiles").select("username, avatar_path").eq("id", session.user.id).maybeSingle();
      setRememberedProfile(data ?? { username: null, avatar_path: null });
    };
    const temporary = localStorage.getItem("simple-market:session-mode") === "temporary";
    if (temporary && !sessionStorage.getItem("simple-market:temporary-session")) {
      supabase.auth.signOut().finally(() => localStorage.removeItem("simple-market:session-mode"));
    } else supabase.auth.getSession().then(({ data }) => loadRemembered(data.session)).catch(() => { setUserEmail(null); setRememberedProfile(null); });
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        void loadRemembered(session).catch(() => setRememberedProfile(null));
      }, 0);
      timers.add(timer);
    });
    return () => { timers.forEach(clearTimeout); sub.subscription.unsubscribe(); };
  }, []);

  async function signInWithPassword() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg(t.auth.msgNeedEmail);
    if (!password) return setMsg(t.auth.msgNeedPassword);
    setBusy(true);
    try {
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    setBusy(false);
    if (error) {
      const wrongCredentials = /invalid login credentials/i.test(error.message);
      return setMsg(wrongCredentials
        ? (L === "zh" ? "邮箱或密码错误，请重新输入。" : "Incorrect email or password. Please try again.")
        : t.auth.msgPasswordLoginFail + error.message);
    }
    if (rememberDevice) {
      localStorage.setItem("simple-market:session-mode", "remembered");
      sessionStorage.removeItem("simple-market:temporary-session");
    } else {
      localStorage.setItem("simple-market:session-mode", "temporary");
      sessionStorage.setItem("simple-market:temporary-session", "1");
    }
    setPassword("");
    setMsg(t.auth.msgPasswordLoginOk);
    if (redirectAfterLogin) window.location.href = redirectAfterLogin;
    } catch (error) {
      setMsg(L === "zh" ? "请求失败或超时，请检查网络后重试。" : "Request failed or timed out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function registerWithPassword() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg(t.auth.msgNeedEmail);
    if (password.length < 6) return setMsg(L === "zh" ? "密码至少需要 6 位。" : "Password must be at least 6 characters.");
    setBusy(true);
    try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
      options: { emailRedirectTo: `${base}/${L}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      const alreadyRegistered = /already registered|already been registered|user already exists/i.test(error.message);
      return setMsg(alreadyRegistered
        ? (L === "zh" ? "该邮箱已被注册，请直接登录或使用“忘记密码”。" : "This email is already registered. Sign in or use “Forgot password”.")
        : (L === "zh" ? "注册失败：" : "Registration failed: ") + error.message);
    }
    // With email confirmation enabled, Supabase deliberately returns an
    // obfuscated user for an existing confirmed address. An empty identities
    // array is the supported signal that no new account/email was created.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setMsg(L === "zh" ? "该邮箱已被注册，请直接登录或使用“忘记密码”。" : "This email is already registered. Sign in or use “Forgot password”.");
      return;
    }
    if (data.session) {
      await supabase.auth.signOut();
      setMsg(L === "zh" ? "邮箱确认配置异常，已停止自动登录。请联系管理员启用邮箱确认。" : "Email confirmation is misconfigured. Automatic sign-in was stopped; please contact the administrator.");
      return;
    }
    setMsg(L === "zh" ? "注册申请已提交，请打开邮箱中的确认邮件完成注册。" : "Registration submitted. Open the confirmation email to finish signing up.");
    } catch (error) {
      setMsg(L === "zh" ? "请求失败或超时，请检查网络后重试。" : "Request failed or timed out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function sendLink() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg(t.auth.msgNeedEmail);
    setBusy(true);
    try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: `${base}/${L}/auth/callback`, shouldCreateUser: false },
    });
    setBusy(false);
    setMsg(error ? t.auth.msgSendFail + error.message : t.auth.msgLinkSent);
    } catch (error) {
      setMsg(L === "zh" ? "请求失败或超时，请检查网络后重试。" : "Request failed or timed out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function resendConfirmation() {
    const e=email.trim();
    if(!e)return setMsg(t.auth.msgNeedEmail);
    setBusy(true);setMsg("");
    try{const base=process.env.NEXT_PUBLIC_SITE_URL||window.location.origin;
    const r=await supabase.auth.resend({type:"signup",email:e,options:{emailRedirectTo:`${base}/${L}/auth/callback`}});
    setMsg(r.error?(L==="zh"?"重发失败：":"Resend failed: ")+r.error.message:(L==="zh"?"如果该邮箱有待确认的注册申请，我们已请求重新发送确认链接。请检查垃圾邮件。":"If this email has a pending registration, a new confirmation link has been requested. Check your spam folder."));
    }catch{setMsg(L==="zh"?"请求超时，请稍后重试。":"Request timed out. Please try again later.")}finally{setBusy(false)}
  }
  async function signOut() {
    setMsg("");
    const { error } = await supabase.auth.signOut();
    if (error) return setMsg(t.auth.msgSignOutFail + error.message);
    setUserEmail(null);
    setMsg(t.auth.msgSignOutOk);
  }

  async function forgetRememberedAccount() {
    setBusy(true);
    try {
    await supabase.auth.signOut();
    localStorage.removeItem("simple-market:session-mode");
    sessionStorage.removeItem("simple-market:temporary-session");
    setUserEmail(null); setRememberedProfile(null); setEmail(""); setPassword(""); setBusy(false);
    } catch (error) {
      setMsg(L === "zh" ? "请求失败或超时，请检查网络后重试。" : "Request failed or timed out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  const rememberedAvatar = publicStorageUrl(AVATARS_BUCKET, rememberedProfile?.avatar_path);
  const showRememberedAccount = forceLoginForm && !!userEmail && !!rememberedProfile;

  return (
    <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#11131e] p-7 shadow-2xl shadow-black/30 sm:p-10">
      {showRememberedAccount ? (
        <div className="text-center">
          {rememberedAvatar ? <img src={rememberedAvatar} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" /> : <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-500/20 text-3xl font-bold text-violet-300">{(rememberedProfile?.username || "U")[0].toUpperCase()}</div>}
          <div className="mt-4 text-lg font-bold">{rememberedProfile?.username || (L === "zh" ? "未设置 ID" : "No ID set")}</div>
          <button type="button" onClick={() => { window.location.href = redirectAfterLogin || `/${L}/home`; }} className="mt-6 w-full rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-400">{L === "zh" ? "登录" : "Continue"}</button>
          <button type="button" disabled={busy} onClick={forgetRememberedAccount} className="mt-4 text-sm text-zinc-400 hover:text-white hover:underline">{L === "zh" ? "不是您？" : "Not you?"}</button>
        </div>
      ) : userEmail && !forceLoginForm ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-zinc-300">
            {t.auth.loggedInAs} <span className="font-semibold">{userEmail}</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href={`/${L}/account`} className="text-zinc-300 underline underline-offset-4 hover:text-white">{t.common.account}</Link>
            <button type="button" onClick={signOut} className="text-zinc-300 underline underline-offset-4 hover:text-white">{t.auth.signOut}</button>
          </div>
          {msg && <div className="w-full text-sm text-zinc-300">{msg}</div>}
        </div>
      ) : (
        <>
          <h2 className="mb-6 text-xl font-bold">{mode === "login" ? (L === "zh" ? "登录" : "Sign in") : (L === "zh" ? "创建账户" : "Create account")}</h2>
          <div className="grid gap-4">
            <input type="email" autoComplete="email" className="w-full rounded-xl border border-white/10 bg-[#090b13] px-4 py-3 outline-none transition focus:border-violet-400" placeholder={t.auth.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" autoComplete="current-password" className="w-full rounded-xl border border-white/10 bg-[#090b13] px-4 py-3 outline-none transition focus:border-violet-400" placeholder={t.auth.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && (mode === "register" ? registerWithPassword() : signInWithPassword())} />
            {mode === "login" && <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={rememberDevice} onChange={(e)=>setRememberDevice(e.target.checked)} className="accent-violet-500" />{L === "zh" ? "记住此设备（直到主动退出）" : "Remember this device until I sign out"}</label>}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button type="button" onClick={mode === "login" ? signInWithPassword : registerWithPassword} disabled={busy} className="w-full rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40">{busy ? (L === "zh" ? "处理中……" : "Please wait…") : mode === "login" ? t.auth.passwordLogin : (L === "zh" ? "创建账户" : "Create account")}</button>
              {mode === "login" && <Link className="text-sm text-zinc-400 hover:text-white underline underline-offset-4" href={`/${L}/forgot-password`}>{t.auth.forgotPassword}</Link>}
            </div>
          </div>
          {mode === "login" && <><div className="my-5 flex items-center gap-3 text-xs text-zinc-600"><div className="h-px flex-1 bg-zinc-800" /><span>{t.auth.or}</span><div className="h-px flex-1 bg-zinc-800" /></div>
          <button type="button" onClick={sendLink} disabled={busy} className="rounded-xl border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 text-zinc-100 font-semibold px-6 py-3">{busy ? t.auth.sendLinkSending : t.auth.sendLink}</button></>}
          {msg && <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{msg}</div>}
          {mode === "register" && <button type="button" disabled={busy} onClick={resendConfirmation} className="mt-3 text-xs text-violet-300 underline">{L==="zh"?"没有收到确认邮件？重新发送":"No confirmation email? Resend"}</button>}
          <div className="mt-2 text-xs text-zinc-500">{mode === "login" ? t.auth.hint : (L === "zh" ? "请使用本人可以正常接收邮件的邮箱注册，并点击确认链接后使用账户。平台不会索取你的邮箱密码。" : "Register with an email address you can access, then click the confirmation link before using your account. The platform will never ask for your email password.")}</div>
          <div className="mt-6 text-center text-sm text-zinc-400">
            {mode === "login" ? (L === "zh" ? "还没有账户？" : "New here?") : (L === "zh" ? "已经有账户？" : "Already have an account?")}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); setPassword(""); }} className="ml-1 font-semibold text-violet-300 hover:text-violet-200 hover:underline">
              {mode === "login" ? (L === "zh" ? "注册" : "Register") : (L === "zh" ? "返回登录" : "Sign in")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
