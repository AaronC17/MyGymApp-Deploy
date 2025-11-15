// NEXT.JS BUILD FIX — NO PRERENDER
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import ClientDashboard from './ClientDashboard';

export default function DashboardPage() {
  return <ClientDashboard />;
}
