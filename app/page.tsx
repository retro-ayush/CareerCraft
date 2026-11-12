import Dashboard from "@/components/Dashboard";
import Landing from "@/components/Landing";
import { isSignedIn } from "@/lib/session";

/**
 * "/" is both the public landing page and the signed-in dashboard, decided on the server from the session
 * cookie, so the URL never changes to /login. After sign-in, router.refresh() re-renders this as the dashboard.
 */
export default async function HomePage() {
  return (await isSignedIn()) ? <Dashboard /> : <Landing />;
}
