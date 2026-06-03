import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx",
  "png", "jpg", "jpeg", "webp", "gif",
  "txt", "csv",
]);

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

async function getPortalUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

// POST /api/portal/validate-upload
// Body: { filename: string; sizeBytes: number }
// Response: { ok: true } | { error: string }
export async function POST(req: NextRequest) {
  const { user } = await getPortalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { filename?: string; sizeBytes?: number };
  try { body = await req.json() as { filename?: string; sizeBytes?: number }; }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { filename, sizeBytes } = body;

  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }
  if (typeof sizeBytes !== "number") {
    return NextResponse.json({ error: "Missing sizeBytes" }, { status: 400 });
  }

  // Check extension
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({
      error: `File type ".${ext}" is not allowed. Accepted: PDF, Word, Excel, images, CSV, TXT.`,
    }, { status: 422 });
  }

  // Check size
  if (sizeBytes > MAX_BYTES) {
    const mb = (sizeBytes / 1_048_576).toFixed(1);
    return NextResponse.json({
      error: `File is ${mb} MB — the maximum allowed size is 50 MB.`,
    }, { status: 422 });
  }

  // Check filename isn't suspiciously path-traversal-y
  if (/[<>:"/\\|?*\x00-\x1f]/.test(filename)) {
    return NextResponse.json({ error: "Filename contains invalid characters." }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
