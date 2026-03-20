import { ModulePlaceholder } from "@/components/shared/ModulePlaceholder";

export default function ScannerPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4" data-theme="quality">
      <ModulePlaceholder
        title="Warehouse Scanner"
        description="Mobile barcode scanning, container lookup, and scan history will appear here."
        theme="quality"
      />
    </div>
  );
}
