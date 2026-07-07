import { getPortalSession } from "@/lib/portal-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    activeClientId: session.clientId,
    companies: session.availableClients,
  });
}
