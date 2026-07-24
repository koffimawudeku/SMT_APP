import { requireAdmin } from "@/lib/admin-guard";
import LogoutButton from "../../(dashboard)/logout-button";
import AdminNav from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <p className="text-sm font-medium">Panneau Admin — SMT</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <AdminNav />
        <div className="w-40">
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
