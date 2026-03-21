type Status = "green" | "yellow" | "red";

const COLORS: Record<Status, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

export function TrafficLight({ status, tooltip }: { status: string; tooltip: string }) {
  const color = COLORS[status as Status] ?? COLORS.red;
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-white"
      style={{ width: 8, height: 8, backgroundColor: color }}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    />
  );
}

export const TRAFFIC_LIGHT_TOOLTIPS: Record<string, Record<Status, string>> = {
  t1Status: {
    green: "T1 not required or cleared",
    yellow: "T1 submitted — awaiting clearance",
    red: "T1 required — not yet submitted",
  },
  weighingStatus: {
    green: "Weighing OK or not applicable",
    yellow: "Physical control (FYCO) required",
    red: "Weighing not completed",
  },
  custStatus: {
    green: "Import declaration filed (IM A)",
    yellow: "Export declaration — needs attention (EX A)",
    red: "Not yet registered (ZZC)",
  },
  inspStatus: {
    green: "Inspection completed",
    yellow: "Inspection scheduled",
    red: "No inspection scheduled",
  },
};

export function getTrafficTooltip(field: string, status: string): string {
  return TRAFFIC_LIGHT_TOOLTIPS[field]?.[status as Status] ?? status;
}

export function worstStatus(statuses: string[]): string {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("yellow")) return "yellow";
  return "green";
}

/**
 * Columns that show an INLINE traffic light dot (dot + text in same cell).
 * Maps column data key → status field name.
 */
export const INLINE_TRAFFIC_COLUMNS: Record<string, string> = {
  t1: "t1Status",
  weighing: "weighingStatus",
};

/**
 * Dedicated status-only columns (dot only, no text).
 * Maps column data key → status field name.
 */
export const STATUS_ONLY_COLUMNS: Record<string, string> = {
  custStatus: "custStatus",
  inspStatus: "inspStatus",
};

/** Combined: all columns that have traffic light data */
export const TRAFFIC_LIGHT_COLUMNS: Record<string, string> = {
  ...INLINE_TRAFFIC_COLUMNS,
  ...STATUS_ONLY_COLUMNS,
};
