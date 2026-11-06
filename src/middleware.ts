import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response; // not configured yet — don't block

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
