"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  FileText,
  Bell,
  Server,
  Save,
} from "lucide-react";
import { type AppSettings, saveSettings } from "@/lib/actions/admin-actions";

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {label}
      </Label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          checked ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ initialSettings }: { initialSettings: AppSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof AppSettings>(
    section: K,
    key: keyof AppSettings[K],
    value: AppSettings[K][keyof AppSettings[K]]
  ) {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveSettings(settings);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">System Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure platform behavior and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={settings.company.name}
                onChange={(e) => update("company", "name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-port">Default Destination Port</Label>
              <Input
                id="default-port"
                value={settings.company.defaultPort}
                onChange={(e) => update("company", "defaultPort", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={settings.company.timezone}
                onChange={(e) => update("company", "timezone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Document Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-upload">Max Upload Size (MB)</Label>
              <Input
                id="max-upload"
                type="number"
                min={1}
                max={500}
                value={settings.documents.maxUploadSizeMb}
                onChange={(e) =>
                  update("documents", "maxUploadSizeMb", parseInt(e.target.value, 10) || 50)
                }
              />
            </div>
            <Separator />
            <Toggle
              id="auto-classify"
              checked={settings.documents.autoClassify}
              onChange={(v) => update("documents", "autoClassify", v)}
              label="Auto-classify uploaded documents"
            />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Required Document Types</Label>
              <p className="text-xs text-muted-foreground">
                {settings.documents.requiredDocTypes.join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              id="email-enabled"
              checked={settings.notifications.emailEnabled}
              onChange={(v) => update("notifications", "emailEnabled", v)}
              label="Email notifications"
            />
            <Toggle
              id="slack-enabled"
              checked={settings.notifications.slackEnabled}
              onChange={(v) => update("notifications", "slackEnabled", v)}
              label="Slack notifications"
            />
            <Separator />
            <Toggle
              id="alert-customs"
              checked={settings.notifications.alertOnCustomsHold}
              onChange={(v) => update("notifications", "alertOnCustomsHold", v)}
              label="Alert on customs hold"
            />
            <Toggle
              id="alert-quality"
              checked={settings.notifications.alertOnQualityReject}
              onChange={(v) => update("notifications", "alertOnQualityReject", v)}
              label="Alert on quality rejection"
            />
          </CardContent>
        </Card>

        {/* System */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" aria-hidden="true" />
              Security &amp; System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                min={15}
                max={1440}
                value={settings.system.sessionTimeoutMinutes}
                onChange={(e) =>
                  update("system", "sessionTimeoutMinutes", parseInt(e.target.value, 10) || 480)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-login">Max Login Attempts</Label>
              <Input
                id="max-login"
                type="number"
                min={1}
                max={20}
                value={settings.system.maxLoginAttempts}
                onChange={(e) =>
                  update("system", "maxLoginAttempts", parseInt(e.target.value, 10) || 5)
                }
              />
            </div>
            <Separator />
            <Toggle
              id="maintenance-mode"
              checked={settings.system.maintenanceMode}
              onChange={(v) => update("system", "maintenanceMode", v)}
              label="Maintenance mode"
            />
            {settings.system.maintenanceMode && (
              <p className="text-xs text-orange-600 font-medium">
                When active, only admins can access the system.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
