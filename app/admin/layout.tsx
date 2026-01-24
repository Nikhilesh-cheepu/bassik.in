export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth protection is handled by middleware.ts
  // This layout just provides structure for admin pages
  return <>{children}</>;
}
