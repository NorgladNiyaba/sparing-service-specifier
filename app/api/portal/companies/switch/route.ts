import { getPortalSession } from "@/lib/portal-auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await req.json() as { clientId?: string };
  const isValid = session.availableClients.some((c) => c.clientId === clientId);
  if (!clientId || !isValid) return NextResponse.json({ error: "Invalid company" }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("active_client_id", clientId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
