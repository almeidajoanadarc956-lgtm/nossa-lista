// Rendered on demand: the /lista pages need a Supabase session and must not be
// prerendered at build time. Route segment config is ignored in 'use client'
// pages, so it lives here in the (server) layout.
export const dynamic = 'force-dynamic';

export default function ListaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
