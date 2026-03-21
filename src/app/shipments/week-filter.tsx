"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function WeekFilterInner({ weeks, current }: { weeks: number[]; current: number | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    const value = e.target.value;
    if (value) {
      params.set("week", value);
    } else {
      params.delete("week");
    }
    router.push(`/shipments?${params.toString()}`);
  }

  return (
    <select
      value={current ?? ""}
      onChange={handleChange}
      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Filter by week"
    >
      <option value="">All weeks</option>
      {weeks.map((w) => (
        <option key={w} value={w}>Week {w}</option>
      ))}
    </select>
  );
}

export function WeekFilter(props: { weeks: number[]; current: number | null }) {
  return (
    <Suspense fallback={<div className="h-9 w-32 rounded-md border animate-pulse" />}>
      <WeekFilterInner {...props} />
    </Suspense>
  );
}
