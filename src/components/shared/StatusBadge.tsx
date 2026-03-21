import { cn } from "@/lib/utils";
import {
  SHIPMENT_STATUS_CONFIG,
  CONTAINER_STATUS_CONFIG,
  DOCUMENT_STATUS_CONFIG,
  CUSTOMS_STATUS_CONFIG,
  QUALITY_GRADE_CONFIG,
  DISPATCH_STATUS_CONFIG,
} from "@/lib/constants";

const ALL_STATUS_CONFIGS: Record<string, { label: string; color: string; bgColor: string }> = {
  ...SHIPMENT_STATUS_CONFIG,
  ...CONTAINER_STATUS_CONFIG,
  ...DOCUMENT_STATUS_CONFIG,
  ...CUSTOMS_STATUS_CONFIG,
  ...QUALITY_GRADE_CONFIG,
  ...DISPATCH_STATUS_CONFIG,
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = ALL_STATUS_CONFIGS[status] ?? {
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
