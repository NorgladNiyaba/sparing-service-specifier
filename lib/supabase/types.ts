export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: Partial<ClientInsert>;
      };
      client_documents: {
        Row: ClientDocumentRow;
        Insert: ClientDocumentInsert;
        Update: Partial<ClientDocumentInsert>;
      };
      client_uploads: {
        Row: ClientUploadRow;
        Insert: ClientUploadInsert;
        Update: Partial<ClientUploadInsert>;
      };
    };
  };
}

export interface AdvisorRow {
  id:              string;
  name:            string;
  email:           string;
  title:           string;
  microsoft_email: string | null;
  is_active:       boolean;
  created_at:      string;
}

export interface AdvisorInsert {
  name:            string;
  email:           string;
  title?:          string;
  microsoft_email?: string | null;
  is_active?:      boolean;
}

export interface ClientRow {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  company_name: string | null;
  state: string | null;
  business_type: string | null;
  service_track: string;
  monthly_price: number;
  payment_schedule: string;
  office_hours_units: number | null;
  signer_title: string | null;
  billing_address: string | null;
  billing_zip: string | null;
  internal_notes: string | null;
  advisor_id: string | null;
  signed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ClientInsert {
  auth_user_id?: string | null;
  full_name: string;
  email: string;
  company_name?: string | null;
  state?: string | null;
  business_type?: string | null;
  service_track: string;
  monthly_price: number;
  payment_schedule: string;
  office_hours_units?: number | null;
  signer_title?: string | null;
  billing_address?: string | null;
  billing_zip?: string | null;
  internal_notes?: string | null;
  signed_at?: string;
}

export interface ClientDocumentRow {
  id: string;
  client_id: string;
  name: string;
  type: string;
  storage_path: string;
  size_bytes: number | null;
  is_seen: boolean;
  folder: string | null;
  created_at: string;
}

export interface ClientDocumentInsert {
  client_id: string;
  name: string;
  type: string;
  storage_path: string;
  size_bytes?: number | null;
  is_seen?: boolean;
  folder?: string | null;
}

export interface ClientFolderRow {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
}

export interface ClientFolderInsert {
  client_id: string;
  name: string;
}

export interface ClientUploadRow {
  id: string;
  client_id: string;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
}

export interface ClientUploadInsert {
  client_id: string;
  name: string;
  storage_path: string;
  size_bytes?: number | null;
}

export interface UploadRequestRow {
  id: string;
  token: string;
  client_id: string;
  label: string;
  target_folder: string;
  max_files: number;
  file_count: number;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export interface DocumentShareRow {
  id: string;
  token: string;
  document_id: string;
  client_id: string;
  expires_at: string;
  revoked: boolean;
  access_count: number;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}

export interface ClientMessageRow {
  id:         string;
  client_id:  string;
  sender:     "client" | "advisor";
  body:       string;
  is_read:    boolean;
  created_at: string;
}

export interface ClientMessageInsert {
  client_id: string;
  sender:    "client" | "advisor";
  body:      string;
  is_read?:  boolean;
}

export interface PaymentRecordRow {
  id:         string;
  client_id:  string;
  period_key: string;
  amount:     number;
  status:     "paid" | "pending" | "overdue";
  paid_at:    string | null;
  note:       string | null;
  created_at: string;
}

export interface PaymentRecordInsert {
  client_id:  string;
  period_key: string;
  amount:     number;
  status:     "paid" | "pending" | "overdue";
  paid_at?:   string | null;
  note?:      string | null;
}

// Convenience aliases
export type Advisor = AdvisorRow;
export type Client = ClientRow;
export type ClientDocument = ClientDocumentRow;
export type ClientUpload = ClientUploadRow;
export type ClientFolder = ClientFolderRow;
export type UploadRequest = UploadRequestRow;
export type DocumentShare = DocumentShareRow;
export type ClientMessage = ClientMessageRow;
export type PaymentRecord = PaymentRecordRow;
