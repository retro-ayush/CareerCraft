"use client";

import { useState } from "react";
import AgentChat from "@/components/AgentChat";
import ShortlistPanel from "@/components/ShortlistPanel";
import StatsStrip from "@/components/StatsStrip";

/*
 * HOME: Job search chat (left) + live shortlist (right).
 * The stats and shortlist reload every time the agent writes data.
 */
export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <StatsStrip refreshKey={refreshKey} />
      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <section className="md:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="md:col-span-2">
          <ShortlistPanel refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}
