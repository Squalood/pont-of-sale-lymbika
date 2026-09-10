import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <AdminSidebar />
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gray-50 p-6">
          {children}
        </main>
    </div>
  );
}