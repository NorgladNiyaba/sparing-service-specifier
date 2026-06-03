import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

async function getAdminAccess(email: string): Promise<boolean> {
  // Always allow the master ADMIN_EMAIL (covers bootstrap before table exists)
  if (email === process.env.ADMIN_EMAIL) return true;

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await db
      .from("admin_users")
      .select("is_active")
      .eq("email", email)
      .maybeSingle();
    return data?.is_active === true;
  } catch {
    // Table doesn't exist yet or any DB error — fall back to ADMIN_EMAIL only
    return false;
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // ── Admin routes ──
  if (path.startsWith("/admin")) {
    if (path === "/admin/login") return supabaseResponse;
    if (!user?.email) return NextResponse.redirect(new URL("/admin/login", request.url));

    const hasAccess = await getAdminAccess(user.email);
    if (!hasAccess) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("error", "access_denied");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ── Portal routes ──
  if (path.startsWith("/portal")) {
    if (path === "/portal/login") return supabaseResponse;
    if (!user) return NextResponse.redirect(new URL("/portal/login", request.url));
    // Keep admin email out of the client portal
    if (user.email === process.env.ADMIN_EMAIL) {
      return NextResponse.redirect(new URL("/admin/clients", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};
