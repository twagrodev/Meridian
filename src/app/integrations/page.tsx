import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Ship,
  FileCheck,
  Database,
  Mail,
  Brain,
  ScanText,
} from "lucide-react";

interface IntegrationCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: "connected" | "available" | "not_connected";
}

function IntegrationStatusDot({ status }: { status: IntegrationCardProps["status"] }) {
  const config = {
    connected: { color: "bg-green-500", label: "Connected" },
    available: { color: "bg-green-500", label: "Available" },
    not_connected: { color: "bg-gray-400", label: "Not Connected" },
  };

  const { color, label } = config[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function IntegrationCard({ icon, name, description, status }: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
              {icon}
            </div>
            <div>
              <CardTitle>{name}</CardTitle>
            </div>
          </div>
          <IntegrationStatusDot status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button
          variant="outline"
          size="sm"
          disabled
          aria-label={`Configure ${name} integration`}
        >
          Configure
        </Button>
      </CardContent>
    </Card>
  );
}

const integrations: IntegrationCardProps[] = [
  {
    icon: <Ship className="h-5 w-5" />,
    name: "Carrier APIs",
    description:
      "Connect to MSC, CMA CGM, Maersk, and Hapag-Lloyd for real-time vessel tracking, container status, and arrival notifications.",
    status: "not_connected",
  },
  {
    icon: <FileCheck className="h-5 w-5" />,
    name: "Customs (Port Community System)",
    description:
      "Integrate with port community systems for automated customs declarations, status updates, and release notifications.",
    status: "not_connected",
  },
  {
    icon: <Database className="h-5 w-5" />,
    name: "ERP System",
    description:
      "Sync shipment data, invoices, and inventory with your enterprise resource planning system.",
    status: "not_connected",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    name: "Email Notifications",
    description:
      "Send automated email alerts for shipment arrivals, customs clearance, quality issues, and dispatch updates.",
    status: "not_connected",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    name: "Ollama (Local LLM)",
    description:
      "Local language model for document extraction and classification. Runs Mistral 7B on localhost:11434.",
    status: "available",
  },
  {
    icon: <ScanText className="h-5 w-5" />,
    name: "OCR Engine (Tesseract)",
    description:
      "Optical character recognition for scanned documents, EUR1 certificates, and image-based PDFs.",
    status: "available",
  },
];

export default function IntegrationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external services and tools to extend Meridian
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.name} {...integration} />
        ))}
      </div>
    </div>
  );
}
