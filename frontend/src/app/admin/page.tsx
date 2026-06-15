import Link from "next/link";

const sections = [
  {
    href: "/admin/collections",
    title: "Collections",
    description: "Manage data collections and their permissions.",
  },
  {
    href: "/admin/forms",
    title: "Forms",
    description: "Create and edit forms with dynamic sections.",
  },
  {
    href: "/admin/questions",
    title: "Questions",
    description: "Define questions and their answer parameters.",
  },
  {
    href: "/admin/sections",
    title: "Sections",
    description: "Organize questions into reusable sections.",
  },
];

export default function AdminDashboard() {
  return (
    <>
      <h1>Admin Dashboard</h1>
      <div className="admin-dashboard">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="admin-card">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
