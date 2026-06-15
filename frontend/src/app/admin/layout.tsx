import AdminNav from "./components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <AdminNav />
      {children}
    </div>
  );
}
