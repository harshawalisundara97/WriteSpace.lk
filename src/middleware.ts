import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

export async function middleware(request: NextRequest) {
  // ?lang=si|ta|en (TASK-NEXT-010c): apply to this render and remember it. The URL keeps
  // its ?lang so hreflang alternates are crawlable without cookies.
  const lang = request.nextUrl.searchParams.get("lang");
  if (isLocale(lang)) request.cookies.set(LOCALE_COOKIE, lang);
  let response = NextResponse.next({ request });
  const withLocale = (res: NextResponse) => {
    if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return withLocale(response); // not configured yet — don't block

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresh session.
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Admin gate (first line of defense; server actions + RLS also enforce).
  if (path.startsWith("/admin")) {
    if (!user) {
      const to = new URL("/login", request.url);
      to.searchParams.set("next", path);
      return NextResponse.redirect(to);
    }
    const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle();
    if (!admin) return NextResponse.redirect(new URL("/", request.url));
  }

  // Require auth for account area.
  if (path.startsWith("/account") && !user) {
    const to = new URL("/login", request.url);
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  return withLocale(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
