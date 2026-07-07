"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Client, ClientDocument, ClientFolder } from "@/lib/supabase/types";
import { SkeletonClientDetail } from "@/components/admin/skeleton";
import { useAdminUser, canWrite } from "@/components/admin/user-context";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function MessageTicks({ read, pending }: { read: boolean; pending: boolean }) {
  if (pending) {
    return (
      <svg className="h-3 w-3 shrink-0" style={{ color: "#d1d5db" }} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 5.5v2.5l1.75 1.75" />
      </svg>
    );
  }
  if (read) {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "#3b82f6" }} fill="none" viewBox="0 0 20 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6l4 4 6.5-8" />
        <path d="M6.5 6l4 4 6.5-8" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l4 4 6-8" />
    </svg>
  );
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const DOC_TYPES     = ["Contract", "Invoice", "Report", "Onboarding", "Other"];
const EXPIRY_OPTIONS = [{ label: "3 days", value: 3 }, { label: "7 days", value: 7 }, { label: "14 days", value: 14 }, { label: "30 days", value: 30 }];
const MAX_FILE_OPTIONS = [1, 5, 10, 20, 50, 100];

async function openAdminDoc(doc: ClientDocument) {
  if (doc.storage_path === "__contract__") { window.open(`/admin/contract-preview`, "_blank"); return; }
  const res = await fetch(`/api/admin/signed-url?path=${encodeURIComponent(doc.storage_path)}`);
  const data = await res.json() as { url?: string };
  if (data.url) window.open(data.url, "_blank");
}

function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
      style={{ borderColor: "#ebecef", color: "#6b7280" }}>
      {copied ? (
        <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
      ) : (
        <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>{label}</>
      )}
    </button>
  );
}

interface UploadItem { file: File; name: string; }
interface AccessEntry { id: string; role: string; created_at: string; contacts: { id: string; full_name: string; email: string } | null; }

export default function AdminClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const { role } = useAdminUser();
  const write = canWrite(role);

  const [client,    setClient]    = useState<Client | null>(null);
  const [folders,   setFolders]   = useState<ClientFolder[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Upload modal
  const [uploadFolder,  setUploadFolder]  = useState<string | null>(null);
  const [uploadItems,   setUploadItems]   = useState<UploadItem[]>([]);
  const [uploadType,    setUploadType]    = useState("Report");
  const [uploading,     setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError,   setUploadError]   = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request modal
  const [requestFolder,   setRequestFolder]   = useState<string | null>(null);
  const [requestLabel,    setRequestLabel]    = useState("");
  const [requestMaxFiles, setRequestMaxFiles] = useState(10);
  const [requestExpiry,   setRequestExpiry]   = useState(7);
  const [requestLoading,  setRequestLoading]  = useState(false);
  const [requestLink,     setRequestLink]     = useState("");
  const [requestError,    setRequestError]    = useState("");

  // Share modal
  const [shareDoc,      setShareDoc]      = useState<ClientDocument | null>(null);
  const [shareExpiry,   setShareExpiry]   = useState(7);
  const [shareLoading,  setShareLoading]  = useState(false);
  const [shareLink,     setShareLink]     = useState("");
  const [shareError,    setShareError]    = useState("");
  const [shareMode,     setShareMode]     = useState<"internal" | "external">("internal");
  const [sharePassword, setSharePassword] = useState("");

  // Notes (threaded)
  type Note = { id: string; author_email: string; body: string; created_at: string; updated_at: string };
  const [notesList,      setNotesList]      = useState<Note[]>([]);
  const [newNoteBody,    setNewNoteBody]    = useState("");
  const [noteSaving,     setNoteSaving]     = useState(false);
  const [editingNoteId,  setEditingNoteId]  = useState<string | null>(null);
  const [editNoteBody,   setEditNoteBody]   = useState("");
  const [notesNewest,    setNotesNewest]    = useState(true);

  // Advisor
  const [advisors,        setAdvisors]        = useState<Array<{ id: string; name: string; email: string; title: string }>>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null);
  const [advisorSaving,   setAdvisorSaving]   = useState(false);

  // Add folder
  const [addingFolder,      setAddingFolder]      = useState(false);
  const [addingSubfolderId, setAddingSubfolderId] = useState<string | null>(null);
  const [newFolderName,     setNewFolderName]     = useState("");
  const [folderError,       setFolderError]       = useState("");
  const [openFolders,       setOpenFolders]       = useState<Set<string>>(new Set());

  function toggleFolder(id: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Repair setup
  const [repairing,     setRepairing]     = useState(false);
  const [repairDone,    setRepairDone]    = useState(false);
  const [repairError,   setRepairError]   = useState("");

  async function handleRepair() {
    setRepairing(true); setRepairError(""); setRepairDone(false);
    const res = await fetch(`/api/admin/clients/${clientId}/repair`, { method: "POST" });
    const data = await res.json() as { ok?: boolean; error?: string };
    setRepairing(false);
    if (data.ok) {
      setRepairDone(true);
      // Reload folders + documents
      fetch(`/api/admin/clients/${clientId}`)
        .then((r) => r.json())
        .then(({ folders: f, documents: d }: { client: Client; folders: ClientFolder[]; documents: ClientDocument[] }) => {
          setFolders(f ?? []); setDocuments(d ?? []);
        });
    } else {
      setRepairError(data.error ?? "Repair failed.");
    }
  }

  // Delete client
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Delete folder modal
  const [deleteFolderId,      setDeleteFolderId]      = useState<string | null>(null);
  const [deletingFolder,      setDeletingFolder]      = useState(false);

  // Messages
  const [messages,    setMessages]    = useState<Array<{ id: string; sender: string; body: string; is_read: boolean; created_at: string }>>([]);
  const [msgBody,     setMsgBody]     = useState("");
  const [msgSending,  setMsgSending]  = useState(false);
  const msgBottomRef = useRef<HTMLDivElement>(null);

  // Payments
  const [paymentRecords, setPaymentRecords] = useState<Array<{ period_key: string; amount: number; status: string; paid_at: string | null }>>([]);

  // Portal access
  const [accessList,   setAccessList]   = useState<AccessEntry[]>([]);
  const [grantEmail,   setGrantEmail]   = useState("");
  const [grantRole,    setGrantRole]    = useState<"owner" | "member">("member");
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError,   setGrantError]   = useState("");

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}`)
      .then((r) => r.json())
      .then(({ client: c, folders: f, documents: d }: { client: Client; folders: ClientFolder[]; documents: ClientDocument[] }) => {
        setClient(c); setFolders(f ?? []); setDocuments(d ?? []);
        setSelectedAdvisor((c as Client & { advisor_id?: string | null })?.advisor_id ?? null);
        setLoading(false);
      });
    fetch(`/api/admin/clients/${clientId}/messages`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setMessages(d); });
    fetch(`/api/admin/clients/${clientId}/payments`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setPaymentRecords(d); });
    fetch("/api/admin/advisors")
      .then((r) => r.json())
      .then((d: Array<{ id: string; name: string; email: string; title: string; is_active: boolean }>) => {
        if (Array.isArray(d)) setAdvisors(d.filter((a) => a.is_active));
      });
    fetch(`/api/admin/clients/${clientId}/access`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAccessList(d); });
    fetch(`/api/admin/clients/${clientId}/notes`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setNotesList(d); });
  }, [clientId]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleUpload() {
    if (!uploadItems.length || !uploadFolder) return;
    setUploading(true); setUploadError(""); setUploadProgress(0);
    const newDocs: ClientDocument[] = [];

    for (let i = 0; i < uploadItems.length; i++) {
      const { file, name } = uploadItems[i];
      const form = new FormData();
      form.append("file", file);
      form.append("clientId", clientId);
      form.append("folder_id", uploadFolder);
      form.append("name", name || file.name.replace(/\.[^.]+$/, ""));
      form.append("type", uploadType);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json() as ClientDocument & { error?: string };
      if (!res.ok) { setUploadError(data.error ?? "Upload failed."); setUploading(false); return; }
      newDocs.push(data);
      setUploadProgress(Math.round(((i + 1) / uploadItems.length) * 100));
    }

    setDocuments((prev) => [...newDocs.reverse(), ...prev]);
    setUploadFolder(null); setUploadItems([]); setUploading(false); setUploadProgress(0);
  }

  async function handleGenerateRequest() {
    if (!requestFolder || !requestLabel.trim()) return;
    setRequestLoading(true); setRequestError(""); setRequestLink("");
    const res = await fetch("/api/admin/upload-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, label: requestLabel, targetFolderId: requestFolder, maxFiles: requestMaxFiles, expiryDays: requestExpiry }),
    });
    const data = await res.json() as { url?: string; error?: string };
    setRequestLoading(false);
    if (!res.ok) { setRequestError(data.error ?? "Failed to create link."); return; }
    setRequestLink(data.url ?? "");
  }

  async function handleGenerateShare() {
    if (!shareDoc) return;
    setShareLoading(true); setShareError(""); setShareLink("");
    const res = await fetch("/api/admin/document-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: shareDoc.id, clientId, expiryDays: shareExpiry, mode: shareMode, password: shareMode === "external" ? sharePassword : undefined }),
    });
    const data = await res.json() as { url?: string; error?: string };
    setShareLoading(false);
    if (!res.ok) { setShareError(data.error ?? "Failed."); return; }
    setShareLink(data.url ?? "");
  }

  async function handleAddNote() {
    if (!newNoteBody.trim()) return;
    setNoteSaving(true);
    const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNoteBody.trim() }),
    });
    setNoteSaving(false);
    if (res.ok) {
      const note = await res.json() as Note;
      setNotesList((prev) => [note, ...prev]);
      setNewNoteBody("");
    }
  }

  async function handleEditNote(id: string) {
    if (!editNoteBody.trim()) return;
    const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, body: editNoteBody.trim() }),
    });
    if (res.ok) {
      const updated = await res.json() as Note;
      setNotesList((prev) => prev.map((n) => n.id === id ? updated : n));
      setEditingNoteId(null);
    }
  }

  async function handleDeleteNote(id: string) {
    const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setNotesList((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleConfirmDeleteFolder() {
    if (!deleteFolderId) return;
    setDeletingFolder(true);
    const res = await fetch(`/api/admin/clients/${clientId}/folders`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteFolderId }),
    });
    setDeletingFolder(false);
    if (res.ok) {
      const removedIds = new Set([deleteFolderId]);
      let found = true;
      while (found) {
        found = false;
        for (const f of folders) {
          if (f.parent_id && removedIds.has(f.parent_id) && !removedIds.has(f.id)) {
            removedIds.add(f.id); found = true;
          }
        }
      }
      setFolders((prev) => prev.filter((f) => !removedIds.has(f.id)));
      setDocuments((prev) => prev.filter((d) => !d.folder_id || !removedIds.has(d.folder_id)));
    }
    setDeleteFolderId(null);
  }

  async function handleAddFolder(parentId: string | null = null) {
    if (!newFolderName.trim()) return;
    setFolderError("");
    const res = await fetch(`/api/admin/clients/${clientId}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parent_id: parentId }),
    });
    const data = await res.json() as ClientFolder & { error?: string };
    if (!res.ok) { setFolderError(data.error ?? "Failed to create folder."); return; }
    setFolders((prev) => [...prev, data]);
    setNewFolderName(""); setAddingFolder(false); setAddingSubfolderId(null);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/clients");
    else setDeleting(false);
  }

  function openUploadModal(folderId: string) {
    setUploadFolder(folderId); setUploadItems([]); setUploadError(""); setUploadType("Report");
  }
  function openRequestModal(folderId: string) {
    setRequestFolder(folderId); setRequestLabel(""); setRequestLink(""); setRequestError("");
    setRequestMaxFiles(10); setRequestExpiry(7);
  }
  function openShareModal(doc: ClientDocument) {
    setShareDoc(doc); setShareLink(""); setShareError(""); setShareExpiry(7);
    setShareMode("internal"); setSharePassword("");
  }

  const docsInFolder = (folderId: string) => documents.filter((d) => d.folder_id === folderId);
  const subfolders   = (parentId: string | null) => folders.filter((f) => f.parent_id === parentId);
  const folderName   = (folderId: string) => folders.find((f) => f.id === folderId)?.name ?? "Folder";

  function renderFolderNode(folder: ClientFolder, depth: number): React.ReactNode {
    const docs = docsInFolder(folder.id);
    const children = subfolders(folder.id);
    const isOpen = openFolders.has(folder.id);
    return (
      <div key={folder.id} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#ebecef", marginLeft: depth > 0 ? 20 : 0 }}>
        <div className="flex items-center justify-between px-5 py-3.5">
          <button onClick={() => toggleFolder(folder.id)} className="flex flex-1 items-center gap-3 text-left">
            <svg className="h-4 w-4 shrink-0" style={{ color: "#1d4ed8" }} fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: "#171717" }}>{folder.name}</span>
            <span className="text-xs" style={{ color: "#9ca3af" }}>
              {docs.length === 0 && children.length === 0 ? "Empty" : `${docs.length} file${docs.length !== 1 ? "s" : ""}${children.length > 0 ? ` · ${children.length} subfolder${children.length !== 1 ? "s" : ""}` : ""}`}
            </span>
            <svg className="ml-1 h-3.5 w-3.5 shrink-0 transition-transform duration-200" style={{ color: "#9ca3af", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {write && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setAddingSubfolderId(folder.id); setNewFolderName(""); setFolderError(""); }}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[0.65rem] font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                style={{ borderColor: "#ebecef", color: "#6b7280" }} title="Add subfolder">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </button>
              <button onClick={() => openRequestModal(folder.id)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                style={{ borderColor: "#ebecef", color: "#6b7280" }}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                Request
              </button>
              <button onClick={() => openUploadModal(folder.id)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                style={{ borderColor: "#ebecef", color: "#6b7280" }}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Upload
              </button>
              <button onClick={() => setDeleteFolderId(folder.id)}
                className="flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition hover:border-red-300 hover:text-red-600"
                style={{ borderColor: "#ebecef", color: "#9ca3af" }} title="Delete folder">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {/* Inline subfolder creation */}
        {isOpen && addingSubfolderId === folder.id && (
          <div className="border-t px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
            <div className="flex items-center gap-2">
              <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddFolder(folder.id); if (e.key === "Escape") setAddingSubfolderId(null); }}
                placeholder="Subfolder name…" autoFocus
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition" style={inputBorder} onFocus={inputFocus} onBlur={inputBlur} />
              <button onClick={() => void handleAddFolder(folder.id)} disabled={!newFolderName.trim()}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-40" style={{ background: "#1d4ed8" }}>Create</button>
              <button onClick={() => setAddingSubfolderId(null)} className="text-xs" style={{ color: "#9ca3af" }}>Cancel</button>
            </div>
            {folderError && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{folderError}</p>}
          </div>
        )}
        {isOpen && docs.length > 0 && (
          <div className="border-t" style={{ borderColor: "#f3f4f6" }}>
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 border-b px-5 py-3 last:border-0" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(29,78,216,0.07)" }}>
                  <span className="text-[0.5rem] font-bold uppercase" style={{ color: "#1d4ed8" }}>PDF</span>
                </div>
                <div className="min-w-0 flex-1">
                  <button onClick={() => void openAdminDoc(doc)} className="text-xs font-semibold transition-colors hover:underline" style={{ color: "#171717" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")} onMouseLeave={(e) => (e.currentTarget.style.color = "#171717")}>{doc.name}</button>
                  <div className="text-xs" style={{ color: "#9ca3af" }}>{formatDate(doc.created_at)}{doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ""}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!doc.is_seen && <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase text-white" style={{ background: "#1d4ed8" }}>New</span>}
                  {write && (
                    <button onClick={() => openShareModal(doc)} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[0.65rem] font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                      style={{ borderColor: "#ebecef", color: "#6b7280" }}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                      Share
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {isOpen && docs.length === 0 && children.length === 0 && (
          <div className="border-t px-5 py-4 text-xs" style={{ borderColor: "#f3f4f6", color: "#9ca3af" }}>No files in this folder yet.</div>
        )}
        {isOpen && children.length > 0 && (
          <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: "#f3f4f6" }}>
            {children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  async function handleSendMessage() {
    const trimmed = msgBody.trim();
    if (!trimmed || msgSending) return;
    setMsgSending(true);
    const optimistic = { id: crypto.randomUUID(), sender: "advisor", body: trimmed, is_read: false, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setMsgBody("");
    const res = await fetch(`/api/admin/clients/${clientId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });
    setMsgSending(false);
    if (res.ok) {
      const saved = await res.json() as typeof optimistic;
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  async function handleTogglePayment(periodKey: string, amount: number, currentStatus: string) {
    const nextStatus = currentStatus === "paid" ? "pending" : currentStatus === "pending" ? "overdue" : "paid";
    const res = await fetch(`/api/admin/clients/${clientId}/payments`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodKey, amount, status: nextStatus }),
    });
    if (res.ok) {
      const saved = await res.json() as { period_key: string; amount: number; status: string; paid_at: string | null };
      setPaymentRecords((prev) => {
        const exists = prev.find((r) => r.period_key === periodKey);
        if (exists) return prev.map((r) => r.period_key === periodKey ? saved : r);
        return [...prev, saved];
      });
    }
  }

  async function handleGrantAccess() {
    if (!grantEmail.trim()) return;
    setGrantLoading(true); setGrantError("");
    const res = await fetch(`/api/admin/clients/${clientId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail.trim(), role: grantRole }),
    });
    const data = await res.json() as AccessEntry & { error?: string };
    setGrantLoading(false);
    if (!res.ok) { setGrantError(data.error ?? "Failed to grant access."); return; }
    setAccessList((prev) => [...prev, data]);
    setGrantEmail("");
  }

  async function handleRevokeAccess(accessId: string) {
    const res = await fetch(`/api/admin/clients/${clientId}/access`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessId }),
    });
    if (res.ok) setAccessList((prev) => prev.filter((a) => a.id !== accessId));
  }

  async function handleAdvisorChange(advisorId: string | null) {
    setSelectedAdvisor(advisorId);
    setAdvisorSaving(true);
    await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advisor_id: advisorId }),
    });
    setAdvisorSaving(false);
  }

  const inputBorder = { borderColor: "#d1d5db", color: "#171717" };
  const inputFocus  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "#1d4ed8");
  const inputBlur   = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "#d1d5db");

  if (loading) return <SkeletonClientDetail />;
  if (!client) return <div className="px-8 py-8 text-sm" style={{ color: "#9ca3af" }}>Client not found.</div>;

  return (
    <div className="px-8 py-8">
      {/* Back */}
      <button onClick={() => router.push("/admin/clients")}
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors" style={{ color: "#9ca3af" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        All clients
      </button>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>{client.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm" style={{ color: "#6b7280" }}>
            {client.company_name && <><span>{client.company_name}</span><span>·</span></>}
            <span className="flex items-center gap-1">
              {client.email}
              <button
                onClick={() => navigator.clipboard.writeText(client.email)}
                title="Copy email"
                className="ml-0.5 transition-opacity hover:opacity-70"
                style={{ color: "#9ca3af" }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </span>
            <span>·</span>
            <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase" style={{ background: "rgba(29,78,216,0.1)", color: "#1d4ed8" }}>{client.service_track}</span>
            <span>·</span><span>{formatCurrency(client.monthly_price)}/mo</span>
            <span>·</span><span>Signed {formatDate(client.signed_at)}</span>
          </div>
        </div>

        {/* Advisor assignment — managers/super admins only */}
        {write && (
          <div className="flex shrink-0 items-center gap-2">
            <label className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af" }}>Advisor</label>
            <div className="relative">
              <select
                value={selectedAdvisor ?? ""}
                onChange={(e) => void handleAdvisorChange(e.target.value || null)}
                disabled={advisorSaving || advisors.length === 0}
                className="appearance-none rounded-xl border py-2 pl-3 pr-7 text-sm font-medium outline-none transition"
                style={{ borderColor: "#ebecef", color: selectedAdvisor ? "#171717" : "#9ca3af", background: "#f8f8f9", cursor: "pointer" }}
              >
                <option value="">Unassigned</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                {advisorSaving ? (
                  <div className="h-3 w-3 animate-spin rounded-full border border-[#1d4ed8] border-t-transparent" />
                ) : (
                  <svg className="h-3 w-3" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="mb-10 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#ebecef" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Messages</h2>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Thread with {client.full_name}</p>
          </div>
          {messages.filter((m) => m.sender === "client" && !m.is_read).length > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold text-white" style={{ background: "#1d4ed8" }}>
              {messages.filter((m) => m.sender === "client" && !m.is_read).length} new
            </span>
          )}
        </div>
        <div className="flex flex-col" style={{ height: 320 }}>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "#9ca3af" }}>No messages yet.</p>
            ) : messages.map((msg) => {
              const isAdvisor = msg.sender === "advisor";
              const isPending = !("client_id" in msg);
              return (
                <div key={msg.id} className={`flex ${isAdvisor ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[70%] flex-col gap-0.5 ${isAdvisor ? "items-end" : "items-start"}`}>
                    <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={isAdvisor
                        ? { background: "#1d4ed8", color: "#fff", borderBottomRightRadius: 6 }
                        : { background: "#f3f4f6", color: "#171717", borderBottomLeftRadius: 6 }}>
                      {msg.body}
                    </div>
                    <div className="mx-1 flex items-center gap-1">
                      <span className="text-[0.6rem]" style={{ color: "#9ca3af" }}>{formatTime(msg.created_at)}</span>
                      {isAdvisor && <MessageTicks read={msg.is_read} pending={isPending} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={msgBottomRef} />
          </div>
          {write && <div className="border-t px-4 py-3 flex gap-2" style={{ borderColor: "#f3f4f6" }}>
            <input
              type="text"
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSendMessage(); }}
              placeholder="Reply as advisor…"
              className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition"
              style={{ borderColor: "#ebecef", color: "#171717" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
            />
            <button
              onClick={() => void handleSendMessage()}
              disabled={!msgBody.trim() || msgSending}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:opacity-85 disabled:opacity-40"
              style={{ background: "#1d4ed8" }}
            >
              <svg className="h-4 w-4 translate-x-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>}
        </div>
      </div>

      {/* Folders */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Folders</h2>
        {write && (
          <button
            onClick={() => { setAddingFolder(true); setNewFolderName(""); setFolderError(""); }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add folder
          </button>
        )}
      </div>

      {/* Inline add-folder form */}
      <AnimatePresence>
        {addingFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border bg-white p-3" style={{ borderColor: "#ebecef" }}>
              <svg className="h-4 w-4 shrink-0" style={{ color: "#1d4ed8" }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddFolder(); if (e.key === "Escape") setAddingFolder(false); }}
                placeholder="Folder name…"
                autoFocus
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition"
                style={inputBorder}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              <button onClick={() => void handleAddFolder(null)} disabled={!newFolderName.trim()}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-40" style={{ background: "#1d4ed8" }}>
                Create
              </button>
              <button onClick={() => setAddingFolder(false)} className="text-xs" style={{ color: "#9ca3af" }}>Cancel</button>
            </div>
            {folderError && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{folderError}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-10 space-y-2">
        {subfolders(null).map((folder) => renderFolderNode(folder, 0))}
      </div>

      {/* Internal notes */}
      <div className="mb-10 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Internal notes</h2>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Private team notes. Not visible to the client.</p>
          </div>
          <button onClick={() => setNotesNewest((n) => !n)}
            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[0.65rem] font-medium transition hover:border-[#d8dbe1]"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}>
            <svg className="h-3 w-3" style={{ transform: notesNewest ? undefined : "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {notesNewest ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* Add note */}
        {write && (
          <div className="border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
            <div className="flex gap-2">
              <textarea
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAddNote(); } }}
                rows={2}
                placeholder="Add a note… (Enter to save, Shift+Enter for new line)"
                className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none transition"
                style={inputBorder}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              <button onClick={() => void handleAddNote()} disabled={!newNoteBody.trim() || noteSaving}
                className="self-end rounded-xl px-4 py-3 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-40"
                style={{ background: "#1d4ed8" }}>
                {noteSaving ? "…" : "Add"}
              </button>
            </div>
          </div>
        )}

        {/* Notes feed */}
        <div className="max-h-[400px] overflow-y-auto divide-y" style={{ borderColor: "#f9f9fb" }}>
          {notesList.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm" style={{ color: "#9ca3af" }}>No notes yet.</p>
          ) : [...notesList].sort((a, b) => notesNewest
            ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ).map((note) => {
            const initials = note.author_email.split("@")[0].split(".").map((s) => s[0]?.toUpperCase()).join("").slice(0, 2);
            const isEditing = editingNoteId === note.id;
            const edited = note.updated_at !== note.created_at;
            return (
              <div key={note.id} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold text-white" style={{ background: "#1d4ed8" }}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: "#171717" }}>{note.author_email.split("@")[0]}</span>
                      <span className="text-[0.6rem]" style={{ color: "#9ca3af" }}>{formatTime(note.created_at)}{edited ? " · edited" : ""}</span>
                    </div>
                    {isEditing ? (
                      <div className="mt-2">
                        <textarea value={editNoteBody} onChange={(e) => setEditNoteBody(e.target.value)} rows={2}
                          className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition" style={inputBorder}
                          onFocus={inputFocus} onBlur={inputBlur} autoFocus />
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => void handleEditNote(note.id)} disabled={!editNoteBody.trim()}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-40" style={{ background: "#1d4ed8" }}>Save</button>
                          <button onClick={() => setEditingNoteId(null)} className="text-xs" style={{ color: "#9ca3af" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#374151" }}>{note.body}</p>
                    )}
                  </div>
                  {write && !isEditing && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => { setEditingNoteId(note.id); setEditNoteBody(note.body); }}
                        className="rounded p-1 transition-colors hover:bg-[#f3f4f6]" style={{ color: "#9ca3af" }} title="Edit">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button onClick={() => void handleDeleteNote(note.id)}
                        className="rounded p-1 transition-colors hover:bg-red-50" style={{ color: "#9ca3af" }} title="Delete">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Payment records ── */}
      {client.signed_at && (() => {
        // Build billing periods from signed_at to today
        const signed  = new Date(client.signed_at);
        const today   = new Date();
        const sched   = client.payment_schedule;
        const price   = client.monthly_price;
        const half    = Math.round(price / 2);
        const periods: Array<{ key: string; label: string; amount: number }> = [];

        function push(date: Date, label: string, amount: number) {
          if (date >= signed && date <= today) {
            periods.push({ key: date.toISOString().slice(0, 10), label, amount });
          }
        }

        if (sched === "monthly-1st" || sched === "monthly-16th") {
          const day = sched === "monthly-1st" ? 1 : 16;
          let y = signed.getFullYear(), mo = signed.getMonth();
          for (let i = 0; i < 60; i++) {
            const d = new Date(y, mo, day);
            if (d > today) break;
            push(d, d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), price);
            mo++; if (mo > 11) { mo = 0; y++; }
          }
        } else {
          let y = signed.getFullYear(), mo = signed.getMonth();
          for (let i = 0; i < 120; i++) {
            const d1 = new Date(y, mo, 1), d16 = new Date(y, mo, 16);
            const lastDay = new Date(y, mo + 1, 0).getDate();
            const monthStr = d1.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            if (d1 > today) break;
            push(d1, `${monthStr} · 1–15`, half);
            if (d16 <= today) push(d16, `${monthStr} · 16–${lastDay}`, half);
            mo++; if (mo > 11) { mo = 0; y++; }
          }
        }

        const recMap = new Map(paymentRecords.map((r) => [r.period_key, r]));
        const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
          paid:    { bg: "rgba(5,150,105,0.09)",  text: "#059669", label: "Paid"    },
          pending: { bg: "rgba(245,158,11,0.09)", text: "#d97706", label: "Pending" },
          overdue: { bg: "rgba(239,68,68,0.09)",  text: "#dc2626", label: "Overdue" },
        };

        return periods.length > 0 ? (
          <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#ebecef" }}>
            <div className="border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Payment records</h2>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Click a status badge to cycle: Paid → Pending → Overdue</p>
            </div>
            <div className="divide-y" style={{ borderColor: "#f9f9fb", maxHeight: 320, overflowY: "auto" }}>
              {[...periods].reverse().map((p) => {
                const rec = recMap.get(p.key);
                const status = rec?.status ?? "pending";
                const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
                return (
                  <div key={p.key} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#171717" }}>{p.label}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p.amount)}
                        {rec?.paid_at ? ` · paid ${new Date(rec.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleTogglePayment(p.key, p.amount, status)}
                      className="rounded-full px-3 py-1 text-[0.65rem] font-semibold transition hover:opacity-75"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;
      })()}

      {/* ── Portal Access ── */}
      <div className="mt-10 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#ebecef" }}>
        <div className="border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Portal Access</h2>
          <p className="text-xs" style={{ color: "#9ca3af" }}>People who can log into the portal and see this company&apos;s data.</p>
        </div>
        <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
          {accessList.length === 0 ? (
            <p className="px-6 py-4 text-sm" style={{ color: "#9ca3af" }}>No portal access granted yet.</p>
          ) : accessList.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "#171717" }}>{entry.contacts?.full_name ?? "—"}</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>{entry.contacts?.email ?? "—"} · <span className="capitalize">{entry.role}</span></p>
              </div>
              {write && (
                <button
                  onClick={() => void handleRevokeAccess(entry.id)}
                  className="text-xs transition-colors hover:text-red-600"
                  style={{ color: "#9ca3af" }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        {write && (
          <div className="border-t px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
            <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Grant access</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleGrantAccess(); }}
                placeholder="contact@email.com"
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition"
                style={{ borderColor: "#d1d5db", color: "#171717" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
              <select
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value as "owner" | "member")}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "#d1d5db", color: "#171717" }}
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
              <button
                onClick={() => void handleGrantAccess()}
                disabled={!grantEmail.trim() || grantLoading}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "#1d4ed8" }}
              >
                {grantLoading ? "…" : "Grant"}
              </button>
            </div>
            {grantError && <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{grantError}</p>}
            <p className="mt-2 text-[0.65rem]" style={{ color: "#9ca3af" }}>The contact must have logged into the portal at least once before you can grant access.</p>
          </div>
        )}
      </div>

      {/* Repair setup */}
      {write && (
        <div className="mt-10 rounded-2xl border p-6" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
          <h2 className="mb-1 text-sm font-semibold" style={{ color: "#374151" }}>Repair client setup</h2>
          <p className="mb-4 text-xs" style={{ color: "#6b7280" }}>
            Re-runs the onboarding setup for this client: creates any missing folders, fixes the contract document location, and ensures portal access is configured. Safe to run multiple times.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleRepair()}
              disabled={repairing}
              className="rounded-lg border px-4 py-2 text-xs font-semibold transition hover:border-[#6b7280] disabled:opacity-50"
              style={{ borderColor: "#d1d5db", color: "#374151" }}
            >
              {repairing ? "Repairing…" : "Repair setup"}
            </button>
            {repairDone && <span className="text-xs font-medium" style={{ color: "#059669" }}>Done — folders and contract are up to date.</span>}
            {repairError && <span className="text-xs" style={{ color: "#dc2626" }}>{repairError}</span>}
          </div>
        </div>
      )}

      {/* Danger zone — super_admin only */}
      {role === "super_admin" && <div className="mt-4 rounded-2xl border p-6" style={{ borderColor: "#fee2e2", background: "#fff5f5" }}>
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "#991b1b" }}>Danger zone</h2>
        <p className="mb-4 text-xs" style={{ color: "#b91c1c" }}>Deleting this account permanently removes the client, all their documents, and their portal access. This cannot be undone.</p>
        {deleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: "#991b1b" }}>Are you sure?</span>
            <button onClick={handleDelete} disabled={deleting} className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-50" style={{ background: "#dc2626" }}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button onClick={() => setDeleteConfirm(false)} className="text-xs" style={{ color: "#9ca3af" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(true)} className="rounded-lg border px-4 py-2 text-xs font-semibold transition hover:bg-[#fee2e2]" style={{ borderColor: "#fca5a5", color: "#dc2626" }}>
            Delete account
          </button>
        )}
      </div>}

      {/* ── Upload modal ── */}
      <AnimatePresence>
        {uploadFolder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setUploadFolder(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-1 text-base font-bold" style={{ color: "#171717" }}>Upload to {folderName(uploadFolder!)}</h3>
              <p className="mb-5 text-xs" style={{ color: "#9ca3af" }}>Files appear in {client.full_name}&apos;s portal immediately.</p>

              {/* Drop zone */}
              <div
                className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-7 transition hover:border-[#1d4ed8]"
                style={{ borderColor: uploadItems.length ? "#1d4ed8" : "#d1d5db" }}
                onClick={() => fileInputRef.current?.click()}>
                {uploadItems.length ? (
                  <>
                    <svg className="mb-2 h-6 w-6" style={{ color: "#1d4ed8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm font-medium" style={{ color: "#1d4ed8" }}>{uploadItems.length} file{uploadItems.length !== 1 ? "s" : ""} selected</p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Click to change</p>
                  </>
                ) : (
                  <>
                    <svg className="mb-2 h-6 w-6" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.025 11.095H6.75z" /></svg>
                    <p className="text-sm" style={{ color: "#6b7280" }}>Click to choose files</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Multiple files supported</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setUploadItems(files.map((f) => ({ file: f, name: f.name.replace(/\.[^.]+$/, "") })));
                }} />
              </div>

              {/* File list with editable names */}
              {uploadItems.length > 0 && (
                <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                  {uploadItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[0.5rem] font-bold text-white" style={{ background: "#1d4ed8" }}>
                        {i + 1}
                      </div>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => setUploadItems((prev) => prev.map((it, j) => j === i ? { ...it, name: e.target.value } : it))}
                        className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none transition"
                        style={inputBorder}
                        onFocus={inputFocus} onBlur={inputBlur}
                      />
                      <button onClick={() => setUploadItems((prev) => prev.filter((_, j) => j !== i))} style={{ color: "#9ca3af" }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-5">
                <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Document type</label>
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#d1d5db", color: "#171717" }}>
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Progress bar */}
              {uploading && uploadItems.length > 1 && (
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-xs" style={{ color: "#6b7280" }}>
                    <span>Uploading…</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#f3f4f6" }}>
                    <motion.div animate={{ width: `${uploadProgress}%` }} className="h-full rounded-full" style={{ background: "#1d4ed8" }} />
                  </div>
                </div>
              )}

              {uploadError && <p className="mb-3 text-xs" style={{ color: "#dc2626" }}>{uploadError}</p>}
              <div className="flex gap-3">
                <button onClick={handleUpload} disabled={!uploadItems.length || uploading}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ background: "#1d4ed8" }}>
                  {uploading ? `Uploading… (${uploadProgress}%)` : `Upload ${uploadItems.length || ""} file${uploadItems.length !== 1 ? "s" : ""}`}
                </button>
                <button onClick={() => setUploadFolder(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "#ebecef", color: "#6b7280" }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Request files modal ── */}
      <AnimatePresence>
        {requestFolder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setRequestFolder(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-1 text-base font-bold" style={{ color: "#171717" }}>Request files · {folderName(requestFolder!)}</h3>
              <p className="mb-5 text-xs" style={{ color: "#9ca3af" }}>
                Generate a secure upload link for {client.full_name}. They verify with their email before uploading.
              </p>
              {!requestLink ? (
                <>
                  <div className="mb-4">
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>What to upload</label>
                    <input type="text" value={requestLabel} onChange={(e) => setRequestLabel(e.target.value)}
                      placeholder="e.g. Please send your Q1 bank statements and W-9"
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition" style={inputBorder}
                      onFocus={inputFocus} onBlur={inputBlur} />
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Max files</label>
                      <select value={requestMaxFiles} onChange={(e) => setRequestMaxFiles(Number(e.target.value))}
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#d1d5db", color: "#171717" }}>
                        {MAX_FILE_OPTIONS.map((n) => <option key={n} value={n}>{n} file{n !== 1 ? "s" : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Expires in</label>
                      <select value={requestExpiry} onChange={(e) => setRequestExpiry(Number(e.target.value))}
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#d1d5db", color: "#171717" }}>
                        {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {requestError && <p className="mb-3 text-xs" style={{ color: "#dc2626" }}>{requestError}</p>}
                  <div className="flex gap-3">
                    <button onClick={handleGenerateRequest} disabled={!requestLabel.trim() || requestLoading}
                      className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ background: "#1d4ed8" }}>
                      {requestLoading ? "Generating…" : "Generate link"}
                    </button>
                    <button onClick={() => setRequestFolder(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "#ebecef", color: "#6b7280" }}>Cancel</button>
                  </div>
                </>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-semibold" style={{ color: "#6b7280" }}>Secure upload link</p>
                  <div className="mb-3 flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: "#ebecef", background: "#f8f8f9" }}>
                    <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "#171717" }}>{requestLink}</span>
                    <CopyButton value={requestLink} />
                  </div>
                  <p className="mb-4 text-xs" style={{ color: "#9ca3af" }}>
                    Expires in {requestExpiry} days · max {requestMaxFiles} file{requestMaxFiles !== 1 ? "s" : ""} · email verification required
                  </p>
                  <button onClick={() => setRequestFolder(null)} className="w-full rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "#ebecef", color: "#6b7280" }}>Done</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete folder modal ── */}
      <AnimatePresence>
        {deleteFolderId && (() => {
          const f = folders.find((x) => x.id === deleteFolderId);
          const kids = folders.filter((x) => x.parent_id === deleteFolderId);
          const docs = documents.filter((x) => x.folder_id === deleteFolderId);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={(e) => { if (e.target === e.currentTarget && !deletingFolder) setDeleteFolderId(null); }}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <svg className="h-6 w-6" style={{ color: "#dc2626" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-base font-bold" style={{ color: "#171717" }}>Delete &ldquo;{f?.name}&rdquo;?</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  {kids.length > 0 || docs.length > 0
                    ? `This folder contains ${docs.length} file${docs.length !== 1 ? "s" : ""} and ${kids.length} subfolder${kids.length !== 1 ? "s" : ""}. Everything inside will be permanently deleted.`
                    : "This empty folder will be permanently deleted."}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>This action cannot be undone.</p>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => void handleConfirmDeleteFolder()} disabled={deletingFolder}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: "#dc2626" }}>
                    {deletingFolder ? "Deleting…" : "Delete folder"}
                  </button>
                  <button onClick={() => setDeleteFolderId(null)} disabled={deletingFolder}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition hover:bg-[#f8f8f9]"
                    style={{ borderColor: "#ebecef", color: "#6b7280" }}>
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Share document modal ── */}
      <AnimatePresence>
        {shareDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShareDoc(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-1 text-base font-bold" style={{ color: "#171717" }}>Share document</h3>
              <p className="mb-1 text-sm font-medium" style={{ color: "#171717" }}>{shareDoc.name}</p>
              <p className="mb-5 text-xs" style={{ color: "#9ca3af" }}>
                Choose how the recipient will access this document.
              </p>
              {!shareLink ? (
                <>
                  {/* Mode toggle */}
                  <div className="mb-4">
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Share type</label>
                    <div className="flex gap-2">
                      {(["internal", "external"] as const).map((m) => (
                        <button key={m} onClick={() => setShareMode(m)}
                          className="flex-1 rounded-lg border py-2.5 text-xs font-semibold transition"
                          style={{
                            borderColor: shareMode === m ? "#1d4ed8" : "#d1d5db",
                            background:  shareMode === m ? "rgba(29,78,216,0.06)" : "transparent",
                            color:       shareMode === m ? "#1d4ed8" : "#6b7280",
                          }}>
                          {m === "internal" ? "Internal (login required)" : "External (password)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Password for external */}
                  {shareMode === "external" && (
                    <div className="mb-4">
                      <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>
                        Access password <span className="normal-case font-normal text-[#9ca3af]">(optional)</span>
                      </label>
                      <input type="text" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)}
                        placeholder="Leave blank for no password"
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition" style={inputBorder}
                        onFocus={inputFocus} onBlur={inputBlur} />
                    </div>
                  )}

                  <div className="mb-5">
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Expires in</label>
                    <select value={shareExpiry} onChange={(e) => setShareExpiry(Number(e.target.value))}
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#d1d5db", color: "#171717" }}>
                      {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {shareError && <p className="mb-3 text-xs" style={{ color: "#dc2626" }}>{shareError}</p>}
                  <div className="flex gap-3">
                    <button onClick={handleGenerateShare} disabled={shareLoading}
                      className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ background: "#1d4ed8" }}>
                      {shareLoading ? "Generating…" : "Generate link"}
                    </button>
                    <button onClick={() => setShareDoc(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "#ebecef", color: "#6b7280" }}>Cancel</button>
                  </div>
                </>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-semibold" style={{ color: "#6b7280" }}>Secure download link</p>
                  <div className="mb-3 flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: "#ebecef", background: "#f8f8f9" }}>
                    <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "#171717" }}>{shareLink}</span>
                    <CopyButton value={shareLink} />
                  </div>
                  <p className="mb-4 text-xs" style={{ color: "#9ca3af" }}>
                    Expires in {shareExpiry} days · {shareMode === "internal" ? "login required" : sharePassword ? "password protected" : "no password"} · activity is logged
                  </p>
                  <button onClick={() => setShareDoc(null)} className="w-full rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "#ebecef", color: "#6b7280" }}>Done</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
