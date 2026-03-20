import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS_CONFIG } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = SHIPMENT_STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
