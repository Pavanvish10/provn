import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Rocket, AlertTriangle, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { StatTile } from "@/components/StatTile";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useLaunchMetrics,
  usePlatformHealth,
  useIntegrationHealth,
  useLaunchReadinessChecklist,
  useOperationalAlerts,
  useFeatureFlags,
  useToggleFeatureFlag,
  type HealthState,
  type ReadinessStatus,
} from "@/lib/admin-command-center-client";
import {
  useSystemSettings,
  useUpdateMaintenanceMode,
  useUpdateAnnouncement,
} from "@/lib/system-settings-client";

export const Route = createFileRoute("/admin/launch")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "Launch Command Center · Admin · Provn" },
      {
        name: "description",
        content: "Real platform metrics, health, launch readiness, and operational controls.",
      },
    ],
  }),
  component: LaunchCommandCenter,
});

function formatCents(cents: number) {
  return `₹${(cents / 100).toFixed(2)}`;
}

const HEALTH_STYLES: Record<HealthState, string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  not_configured: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  not_available: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};
const HEALTH_LABELS: Record<HealthState, string> = {
  healthy: "Healthy",
  warning: "Warning",
  error: "Error",
  not_configured: "Not configured",
  not_available: "Not available",
};

const READINESS_STYLES: Record<ReadinessStatus, string> = {
  pass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fail: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  not_configured: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  not_verified: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};
const READINESS_LABELS: Record<ReadinessStatus, string> = {
  pass: "PASS",
  warning: "WARNING",
  fail: "FAIL",
  not_configured: "NOT CONFIGURED",
  not_verified: "NOT VERIFIED",
};

function LaunchCommandCenter() {
  const { data: user } = useCurrentUser();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useLaunchMetrics();
  const { data: health, isLoading: healthLoading } = usePlatformHealth();
  const { data: integrations } = useIntegrationHealth();
  const readiness = useLaunchReadinessChecklist();
  const { data: alertsData, isLoading: alertsLoading } = useOperationalAlerts();
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();

  const updateMaintenance = useUpdateMaintenanceMode(user?.id);
  const updateAnnouncement = useUpdateAnnouncement(user?.id);
  const toggleFlag = useToggleFeatureFlag(user?.id);

  const [maintenanceDraft, setMaintenanceDraft] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState<string | null>(null);
  const [confirmMaintenanceOn, setConfirmMaintenanceOn] = useState(false);
  const [pendingFlag, setPendingFlag] = useState<{ key: string; enabled: boolean } | null>(null);

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <Rocket className="h-3.5 w-3.5 text-brand" /> Admin only
          </div>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Launch Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real platform metrics, infrastructure health, launch readiness, and operational controls
            — no fabricated numbers.
          </p>
        </div>
      </div>

      {/* 1. Metrics */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg">Platform metrics</h2>
        {metricsError ? (
          <EmptyState text="Could not load platform metrics." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Total users" value={metrics?.totalUsers} loading={metricsLoading} />
            <StatTile label="Students" value={metrics?.students} loading={metricsLoading} />
            <StatTile label="Colleges" value={metrics?.colleges} loading={metricsLoading} />
            <StatTile
              label="College staff"
              value={metrics?.collegeStaff}
              loading={metricsLoading}
            />
            <StatTile label="Recruiters" value={metrics?.recruiters} loading={metricsLoading} />
            <StatTile label="Companies" value={metrics?.companies} loading={metricsLoading} />
            <StatTile
              label="Active users (7d)"
              value={metrics?.activeUsers7d}
              loading={metricsLoading}
            />
            <StatTile label="Resumes" value={metrics?.resumes} loading={metricsLoading} />
            <StatTile
              label="Resumes analyzed"
              value={metrics?.resumesAnalyzed}
              loading={metricsLoading}
            />
            <StatTile
              label="Job applications"
              value={metrics?.jobApplications}
              loading={metricsLoading}
            />
            <StatTile
              label="Drive applications"
              value={metrics?.driveApplications}
              loading={metricsLoading}
            />
            <StatTile label="Jobs posted" value={metrics?.jobs} loading={metricsLoading} />
            <StatTile
              label="Placement drives"
              value={metrics?.placementDrives}
              loading={metricsLoading}
            />
            <StatTile label="Challenges" value={metrics?.challenges} loading={metricsLoading} />
            <StatTile
              label="Challenges completed"
              value={metrics?.challengesCompleted}
              loading={metricsLoading}
            />
            <StatTile
              label="Verified skills"
              value={metrics?.verifiedSkills}
              loading={metricsLoading}
            />
            <StatTile
              label="AI usage (transactions)"
              value={metrics?.aiCreditTransactions}
              loading={metricsLoading}
            />
            <StatTile
              label="Succeeded payments"
              value={metrics?.succeededPayments}
              loading={metricsLoading}
            />
            <StatTile
              label="Revenue"
              value={metricsLoading ? undefined : formatCents(metrics?.revenueCents ?? 0)}
              loading={metricsLoading}
            />
            <StatTile
              label="Active subscriptions"
              value={metrics?.activeSubscriptions}
              loading={metricsLoading}
            />
            <StatTile
              label="Notifications"
              value={metrics?.notifications}
              loading={metricsLoading}
            />
          </div>
        )}
      </section>

      {/* 2. Platform health */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg">Platform health</h2>
        {healthLoading ? (
          <p className="text-sm text-muted-foreground">Checking…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {health?.map((h) => (
              <div key={h.key} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{h.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HEALTH_STYLES[h.state]}`}
                  >
                    {HEALTH_LABELS[h.state]}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{h.detail}</p>
              </div>
            ))}
            {(
              [
                { key: "gemini", label: "AI (Gemini)" },
                { key: "resend", label: "Email (Resend)" },
                { key: "judge0", label: "Code execution (Judge0)" },
                { key: "stripe", label: "Payments (Stripe)" },
              ] as const
            ).map((i) => {
              const configured = integrations?.[i.key];
              const state: HealthState =
                configured === undefined
                  ? "not_available"
                  : configured
                    ? "healthy"
                    : "not_configured";
              return (
                <div key={i.key} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{i.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HEALTH_STYLES[state]}`}
                    >
                      {HEALTH_LABELS[state]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {configured
                      ? "API key configured."
                      : "API key not set — feature degrades gracefully."}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Launch readiness checklist */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg">Launch readiness checklist</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {readiness.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (
                readiness.map((item) => (
                  <tr key={item.area} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{item.area}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${READINESS_STYLES[item.status]}`}
                      >
                        {READINESS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Operational alerts */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg">Operational alerts</h2>
        {alertsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Real signals
              </div>
              {(alertsData?.alerts.length ?? 0) === 0 ? (
                <EmptyState text="No alerts." />
              ) : (
                <ul className="space-y-2">
                  {alertsData?.alerts.map((a) => (
                    <li key={a.key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{a.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          a.count > 0
                            ? a.severity === "warning"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {a.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Not available yet
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {alertsData?.unavailable.map((u) => (
                  <li key={u.key}>
                    <span className="font-medium text-foreground">{u.label}:</span> {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 5. Admin controls */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg">Admin controls</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Maintenance mode */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base">Maintenance mode</h3>
              {settingsLoading ? null : (
                <Switch
                  checked={settings?.maintenance.enabled ?? false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setConfirmMaintenanceOn(true);
                    } else {
                      updateMaintenance.mutate({
                        enabled: false,
                        message: settings?.maintenance.message ?? "",
                      });
                    }
                  }}
                  disabled={updateMaintenance.isPending}
                />
              )}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Shows a banner to every signed-in user. Does not lock the app — informational only.
            </p>
            <Textarea
              placeholder="Maintenance message shown to users…"
              defaultValue={settings?.maintenance.message ?? ""}
              onChange={(e) => setMaintenanceDraft(e.target.value)}
              className="mb-2 text-sm"
              rows={2}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={updateMaintenance.isPending || maintenanceDraft === null}
              onClick={() =>
                updateMaintenance.mutate({
                  enabled: settings?.maintenance.enabled ?? false,
                  message: maintenanceDraft ?? settings?.maintenance.message ?? "",
                })
              }
            >
              Save message
            </Button>
          </div>

          {/* Announcement */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base">System announcement</h3>
              {settingsLoading ? null : (
                <Switch
                  checked={settings?.announcement.active ?? false}
                  onCheckedChange={(checked) =>
                    updateAnnouncement.mutate({
                      active: checked,
                      message: announcementDraft ?? settings?.announcement.message ?? "",
                    })
                  }
                  disabled={updateAnnouncement.isPending}
                />
              )}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Shows a dismissible-by-nothing banner to every signed-in user while active.
            </p>
            <Textarea
              placeholder="Announcement text…"
              defaultValue={settings?.announcement.message ?? ""}
              onChange={(e) => setAnnouncementDraft(e.target.value)}
              className="mb-2 text-sm"
              rows={2}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={updateAnnouncement.isPending || announcementDraft === null}
              onClick={() =>
                updateAnnouncement.mutate({
                  active: settings?.announcement.active ?? false,
                  message: announcementDraft ?? settings?.announcement.message ?? "",
                })
              }
            >
              Save message
            </Button>
          </div>

          {/* Feature flags */}
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="mb-3 font-display text-base">Feature status</h3>
            {flagsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-3">
                {flags?.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{f.key}</div>
                      <div className="text-xs text-muted-foreground">{f.description}</div>
                    </div>
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          setPendingFlag({ key: f.key, enabled: checked });
                        } else {
                          toggleFlag.mutate({ key: f.key, enabled: checked });
                        }
                      }}
                      disabled={toggleFlag.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <AdminConfirmDialog
        open={confirmMaintenanceOn}
        onOpenChange={setConfirmMaintenanceOn}
        title="Enable maintenance mode?"
        description="Every signed-in user will see a maintenance banner. This does not block access to the app."
        confirmLabel="Enable"
        destructive
        pending={updateMaintenance.isPending}
        onConfirm={() => {
          updateMaintenance.mutate({
            enabled: true,
            message: maintenanceDraft ?? settings?.maintenance.message ?? "",
          });
          setConfirmMaintenanceOn(false);
        }}
      />

      <AdminConfirmDialog
        open={pendingFlag !== null}
        onOpenChange={(open) => !open && setPendingFlag(null)}
        title={`Disable "${pendingFlag?.key}"?`}
        description="Users will immediately lose access to this feature until it's re-enabled."
        confirmLabel="Disable"
        destructive
        pending={toggleFlag.isPending}
        onConfirm={() => {
          if (pendingFlag) toggleFlag.mutate(pendingFlag);
          setPendingFlag(null);
        }}
      />
    </AppShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
