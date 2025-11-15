// NEXT.JS BUILD FIX — NO PRERENDER
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import SuscripcionClient from './SuscripcionClient';

export default function SuscripcionPage() {
  return <SuscripcionClient />;
}
