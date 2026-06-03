import AdminSidebar from "@/components/admin/sidebar";
import { AdminUserProvider } from "@/components/admin/user-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminUserProvider>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto" style={{ background: "#f2f2f4" }}>
          {children}
        </main>
      </div>
    </AdminUserProvider>
  );
}
