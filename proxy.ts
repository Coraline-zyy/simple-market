// proxy.ts
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED = ["zh", "en"] as const;
type Lang = (typeof SUPPORTED)[number];

function isLang(x: string): x is Lang {
  return (SUPPORTED as readonly string[]).includes(x);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 忽略静态资源 / api
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Root and unprefixed routes default to English.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/en";
    return NextResponse.redirect(url);
  }

  // Prefix unlocalized routes with English.
  const seg1 = pathname.split("/")[1];
  if (!isLang(seg1)) {
    const url = req.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  // ✅ 关键：如果是 /en 或 /zh，必须放行
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
