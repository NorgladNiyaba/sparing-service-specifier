import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export type AdminRole = "super_admin" | "manager" | "viewer";

export interface AdminUser {
  email: string;
  role:  AdminRole;
}

/**
 * Returns the current admin user's email + role, or null if not authenticated / not in admin_users.
 *
 * Bootstrap logic: if admin_users is empty and the caller is ADMIN_EMAIL, we auto-insert them
 * as super_admin so the first login always works without manual SQL seeding.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  const db = createAdminClient();

  // Try to find the user in admin_users
  const { data: adminRow, error } = await db
    .from("admin_users")
    .select("role, is_active")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    // Table might not exist yet — fall back to ADMIN_EMAIL check
    if (user.email === adminEmail) return { email: user.email, role: "super_admin" };
    return null;
  }

  if (adminRow) {
    if (!adminRow.is_active) return null;
    return { email: user.email, role: adminRow.role as AdminRole };
  }

  // Not found in table — auto-seed ADMIN_EMAIL as super_admin on first access
  if (user.email === adminEmail) {
    await db.from("admin_users").upsert(
      { email: user.email, role: "super_admin", created_by: "system" },
      { onConflict: "email" }
    );
    return { email: user.email, role: "super_admin" };
  }

  return null;
}

/** Convenience: require at least a given role. Returns the user or throws 401/403 JSON. */
export function requireRole(user: AdminUser | null, minimum: AdminRole): AdminUser {
  const RANK: Record<AdminRole, number> = { viewer: 0, manager: 1, super_admin: 2 };
  if (!user) throw new Error("401");
  if (RANK[user.role] < RANK[minimum]) throw new Error("403");
  return user;
}
