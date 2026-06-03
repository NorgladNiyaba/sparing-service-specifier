import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export interface AuditPayload {
  actorEmail:  string;
  actorRole:   AdminRole;
  action:      string;          // e.g. "client.updated", "document.uploaded"
  entityType?: string;          // e.g. "client", "document", "advisor"
  entityId?:   string;
  entityLabel?: string;         // human-readable, e.g. client's full name
  changes?:    Record<string, { from: unknown; to: unknown } | unknown>;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function parseUA(ua: string | null): string {
  if (!ua) return "Unknown";
  let browser = "Unknown";
  if (ua.includes("Edg/"))                              browser = "Edge";
  else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox"))                       browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Windows NT"))      os = "Windows";
  else if (ua.includes("Mac OS X"))   os = "macOS";
  else if (ua.includes("iPhone"))     os = "iOS";
  else if (ua.includes("Android"))    os = "Android";
  else if (ua.includes("Linux"))      os = "Linux";

  return `${browser} / ${os}`;
}

/**
 * Fire-and-forget audit write. Never throws — a failed log entry must not
 * break the actual operation.
 */
export function logAudit(req: NextRequest, payload: AuditPayload): void {
  void (async () => {
    try {
      const db = createAdminClient();
      await db.from("audit_logs").insert({
        actor_email:  payload.actorEmail,
        actor_role:   payload.actorRole,
        action:       payload.action,
        entity_type:  payload.entityType  ?? null,
        entity_id:    payload.entityId    ?? null,
        entity_label: payload.entityLabel ?? null,
        changes:      payload.changes     ?? null,
        ip_address:   getIp(req),
        country:      req.headers.get("x-vercel-ip-country") ?? null,
        city:         req.headers.get("x-vercel-ip-city")    ?? null,
        user_agent:   parseUA(req.headers.get("user-agent")),
      });
    } catch {
      // Silent — audit must never break the request
    }
  })();
}
