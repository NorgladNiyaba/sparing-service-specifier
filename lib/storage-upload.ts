import { createClient } from "@/lib/supabase/client";

export const CLIENT_BUCKET = "client-documents";

/**
 * Upload a file straight from the browser to Supabase Storage.
 *
 * Uses XHR rather than the supabase-js client because only XHR exposes upload
 * progress events, which the portal's upload UI depends on.
 */
export function uploadToStorage(
  file: File,
  path: string,
  accessToken: string,
  supabaseUrl: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`)));
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", `${supabaseUrl}/storage/v1/object/${CLIENT_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(file);
  });
}

/** Access token + project URL needed for a direct storage upload. */
export async function getUploadCredentials(): Promise<{ accessToken: string; supabaseUrl: string } | null> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  };
}

/** Filename sanitiser matching the convention used across the portal. */
export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
