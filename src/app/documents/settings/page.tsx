import Link from "next/link";
import { ArrowLeft, Settings, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getComboSettings } from "@/lib/actions/combo-actions";
import { DOC_TYPES, CARRIERS } from "@/lib/constants";
import { ComboSettingsClient } from "./combo-settings-client";

export default async function ComboSettingsPage() {
  const combos = await getComboSettings();

  const comboData = combos.map((c) => ({
    id: c.id,
    name: c.name,
    carrier: c.carrier,
    docType: c.docType,
    fields: JSON.parse(c.fields) as string[],
    active: c.active,
  }));

  const docTypeOptions = Object.entries(DOC_TYPES).map(([label, code]) => ({
    label,
    code,
  }));

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/documents"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Documents
        </Link>
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
            Combo Settings
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure which extraction fields to display per carrier and document type combination.
        </p>
      </div>

      <ComboSettingsClient
        combos={comboData}
        docTypeOptions={docTypeOptions}
        carriers={CARRIERS as unknown as string[]}
      />
    </div>
  );
}
