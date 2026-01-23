// app/auth/callback/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // 把 hash/token 原样带过去（magiclink 的 token 在 hash 里）
  // 注意：server 拿不到真正的 hash，但很多情况下 Supabase 会把 token 放在 URL 的 fragment。
  // 这里我们做“兜底”：如果用户访问 /auth/callback，就统一跳到 /zh/auth/callback
  // 你也可以根据 accept-language 改成 /en
  return NextResponse.redirect(new URL(`/zh/auth/callback${url.search}`, url.origin));
}
