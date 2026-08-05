import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export interface PortalCompany {
  clientId: string;
  companyName: string | null;
  fullName: string;
  role: string;
}

export interface PortalSession {
  contactId: string;
  clientId: string;
  availableClients: PortalCompany[];
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let availableClients: PortalCompany[];
  let contactId: string;

  if (contact) {
    const { data: access } = await admin
      .from("contact_client_access")
      .select("role, client_id, clients(id, full_name, company_name)")
      .eq("contact_id", contact.id);

    if (!access || access.length === 0) return null;

    type JoinedClient = { id: string; full_name: string; company_name: string | null };

    availableClients = access.map((a) => {
      // Supabase types the embedded relation as an array; a many-to-one FK yields one row.
      const raw = a.clients as unknown as JoinedClient | JoinedClient[] | null;
      const cl  = Array.isArray(raw) ? raw[0] ?? null : raw;
      return {
        clientId: a.client_id as string,
        companyName: cl?.company_name ?? null,
        fullName: cl?.full_name ?? "",
        role: a.role as string,
      };
    });
    contactId = contact.id;
  } else {
    // Fallback: clients created directly via pricing flow (auth_user_id on clients table)
    const { data: directClient } = await admin
      .from("clients")
      .select("id, full_name, company_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!directClient) return null;

    availableClients = [{
      clientId: directClient.id,
      companyName: directClient.company_name ?? null,
      fullName: directClient.full_name ?? "",
      role: "owner",
    }];
    contactId = "";
  }

  const activeClientId = cookieStore.get("active_client_id")?.value;
  const isValid = availableClients.some((c) => c.clientId === activeClientId);
  const clientId = activeClientId && isValid ? activeClientId : availableClients[0].clientId;

  return { contactId, clientId, availableClients };
}
