"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  getCurrentWeek,
  formatWeekLabel,
  getAdjacentWeek,
} from "@/lib/week-utils";

export function WeekSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current = getCurrentWeek();
  const week = parseInt(searchParams.get("week") ?? "", 10) || current.week;
  const year = parseInt(searchParams.get("year") ?? "", 10) || current.year;
  const isCurrentWeek = week === current.week && year === current.year;

  const navigate = useCallback(
    (w: number, y: number) => {
      const cur = getCurrentWeek();
      if (w === cur.week && y === cur.year) {
        router.push(pathname);
      } else {
        router.push(`${pathname}?week=${w}&year=${y}`);
      }
    },
    [router, pathname]
  );

  const handlePrev = () => {
    const prev = getAdjacentWeek(week, year, "prev");
    navigate(prev.week, prev.year);
  };

  const handleNext = () => {
    const next = getAdjacentWeek(week, year, "next");
    navigate(next.week, next.year);
  };

  const handleToday = () => {
    router.push(pathname);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Week navigation"
      onKeyDown={handleKeyDown}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handlePrev}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span
        className="min-w-[200px] text-center text-sm font-medium select-none"
        aria-live="polite"
      >
        {formatWeekLabel(week, year)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleNext}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentWeek && (
        <Button
          variant="outline"
          size="sm"
          className="ml-1 h-8 gap-1 text-xs"
          onClick={handleToday}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Today
        </Button>
      )}
    </div>
  );
}
