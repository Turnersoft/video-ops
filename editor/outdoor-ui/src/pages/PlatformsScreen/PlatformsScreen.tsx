import { useCallback, useEffect, useMemo, useState } from "react";
import { layoutStylesFor } from '../../layout';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";

import { Header } from "../../components/Header/Header";
import { Button } from "../../components/Button/Button";
import { Badge } from "../../components/Badge/Badge";
import { SectionLabel } from "../../components/SectionLabel/SectionLabel";
import { useOutdoorUi } from "../../context/OutdoorUiContext";
import { useOutdoorRoute } from "../../hooks/useOutdoorRoute";
import { colors, radii, sharedStyles, spacing } from "../../theme";
import type {
  LoginLink,
  LlmSettings,
  PlatformStatus,
  PlatformsHealthResponse,
  SignupStep,
} from "../../types";
import { fmtDate, platformLabel } from "../../utils/format";
import classes from './PlatformsScreen.module.scss';

function platformStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    connected: "connected",
    configured: "configured",
    missing_credentials: "missing credentials",
    manual: "manual",
    stub: "stub",
  };
  return labels[status] ?? status;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false;
  }
  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function PlatformsScreen() {
  const { layout,  api } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const { navigateToLibrary } = useOutdoorRoute();
  const [health, setHealth] = useState<PlatformsHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [llmBaseUrl, setLlmBaseUrl] = useState("http://192.168.3.251:1234");
  const [llmModel, setLlmModel] = useState("");
  const [llmStatus, setLlmStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, llm] = await Promise.all([
        api.getPlatformsHealth(),
        api.getLlmSettings().catch(() => null),
      ]);
      setHealth(next);
      if (llm) {
        setLlmBaseUrl(llm.baseUrl);
        setLlmModel(llm.model ?? "");
        setLlmStatus(`Local AI · updated ${llm.updatedAt}`);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const handleSaveLlm = useCallback(async () => {
    setBusyAction("save-llm");
    try {
      const saved: LlmSettings = await api.putLlmSettings({
        baseUrl: llmBaseUrl.trim(),
        model: llmModel.trim() || null,
      });
      setLlmBaseUrl(saved.baseUrl);
      setLlmModel(saved.model ?? "");
      setLlmStatus(`Saved · ${saved.updatedAt}`);
      Alert.alert("Local AI", "LM Studio URL saved on the Mac agent.");
    } catch (saveError) {
      Alert.alert(
        "Local AI",
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setBusyAction(null);
    }
  }, [api, llmBaseUrl, llmModel]);

  useEffect(() => {
    void load();
  }, [load]);

  const openUrl = useCallback((url: string | undefined) => {
    if (!url) {
      return;
    }
    void Linking.openURL(url);
  }, []);

  const handleCopyCommand = useCallback(
    async (command: string, label = "Copy command") => {
      const copied = await copyToClipboard(command);
      if (copied) {
        Alert.alert("Copied", `${label} copied to clipboard.`);
        return;
      }
      Alert.alert("Copy command", command);
    },
    [],
  );

  const handleSyncZernio = useCallback(async () => {
    setBusyAction("sync-zernio");
    try {
      const result = await api.syncZernioAccounts();
      const exportCommand = result.exportCommand ?? "";
      if (exportCommand) {
        await copyToClipboard(exportCommand);
        Alert.alert(
          "Zernio synced",
          `Synced ${Object.keys(result.suggestedAccountsJson ?? {}).length} channel(s).\n\nExport copied to clipboard — paste into your Mac shell, then restart the outdoor agent.`,
        );
      } else {
        Alert.alert("Zernio sync", "Sync returned no accounts.");
      }
      await load();
    } catch (syncError) {
      Alert.alert(
        "Sync failed",
        syncError instanceof Error ? syncError.message : String(syncError),
      );
    } finally {
      setBusyAction(null);
    }
  }, [api, load]);

  const handleTest = useCallback(
    async (target: string) => {
      setBusyAction(`test-${target}`);
      try {
        const result = await api.testPlatformOrProvider(target);
        Alert.alert(result.ok ? "OK" : "Failed", result.message || "");
      } catch (testError) {
        Alert.alert(
          "Test failed",
          testError instanceof Error ? testError.message : String(testError),
        );
      } finally {
        setBusyAction(null);
      }
    },
    [api],
  );

  const zernio = health?.providers.zernio;
  const sau = health?.providers.sau;
  const platforms = health?.entries ?? health?.platforms ?? [];
  const zernioRows = platforms.filter((entry) => entry.provider === "zernio");
  const sauRows = platforms.filter(
    (entry) => entry.provider === "social-auto-upload",
  );
  const progress = health?.connectProgress;

  const pageContentStyle = useMemo((): ViewStyle => {
    const { flex, flexGrow, minHeight, ...content } = layoutStyles.main;
    return content;
  }, [layoutStyles.main]);

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <View style={styles.headerWrap}>
        <Header
          title="Platforms / credentials"
          actions={[
            { label: "Scripts", onPress: navigateToLibrary, variant: "back" },
            {
              label: loading ? "Refreshing…" : "Refresh",
              onPress: () => {
                void load();
              },
              disabled: loading,
            },
          ]}
        />
      </View>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageContentStyle}
        keyboardShouldPersistTaps="handled"
      >
        {loading && !health ? (
          <ActivityIndicator color={colors.orange} style={styles.spinner} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {health ? (
          <>
            <Text style={sharedStyles.cardMeta}>
              Operator console — secrets stay in Mac env. English via Zernio ·
              China via SAU. Checked {fmtDate(health.checkedAt)}
            </Text>

            <SectionLabel>Local AI (LM Studio)</SectionLabel>
            <Text style={sharedStyles.cardMeta}>
              Mac agent calls this OpenAI-compatible server for animation.md
              edits. Change from iPhone outdoors (e.g. Tailscale
              http://100.66.185.67:1234).
            </Text>
            {llmStatus ? <Text style={styles.llmStatus}>{llmStatus}</Text> : null}
            <TextInput
              style={styles.llmInput}
              value={llmBaseUrl}
              onChangeText={setLlmBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.3.251:1234"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.llmInput}
              value={llmModel}
              onChangeText={setLlmModel}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="model id (optional — first LM Studio model if empty)"
              placeholderTextColor={colors.muted}
            />
            <Button
              label={busyAction === "save-llm" ? "Saving…" : "Save LM Studio URL"}
              onPress={() => {
                void handleSaveLlm();
              }}
              disabled={busyAction === "save-llm"}
            />

            {progress ? (
              <>
                <SectionLabel>
                  Connect all · {progress.ready}/{progress.total} ready
                </SectionLabel>
                <View style={styles.progressCard}>
                  <Text style={sharedStyles.cardMeta}>
                    {progress.stubOnly
                      ? "Publish modes are still stub — finish logins, then set live env and restart the agent."
                      : "At least one provider is in live mode."}
                  </Text>
                  <Text style={sharedStyles.cardMeta}>
                    Missing / not connected:{" "}
                    {(progress.missing ?? []).join(", ") || "none"}
                    {(progress.manual ?? []).length
                      ? ` · Manual only: ${(progress.manual ?? []).join(", ")}`
                      : ""}
                  </Text>
                  <View style={sharedStyles.takeActions}>
                    <Button
                      label="1. Open Zernio"
                      onPress={() =>
                        openUrl(
                          zernio?.signupUrl ?? "https://zernio.com/signup",
                        )
                      }
                      variant="primary"
                    />
                    <Button
                      label="2. Create API key"
                      onPress={() =>
                        openUrl(
                          zernio?.apiKeysUrl ??
                            zernio?.dashboardUrl ??
                            "https://zernio.com/dashboard/api-keys",
                        )
                      }
                    />
                    <Button
                      label="3. Connect EN accounts"
                      onPress={() =>
                        openUrl(
                          zernio?.connectGuideUrl ??
                            zernio?.dashboardUrl ??
                            "https://zernio.com/dashboard",
                        )
                      }
                    />
                    <Button
                      label={
                        busyAction === "sync-zernio"
                          ? "Syncing…"
                          : "4. Sync Zernio accounts"
                      }
                      onPress={() => {
                        void handleSyncZernio();
                      }}
                      disabled={busyAction === "sync-zernio"}
                    />
                    <Button
                      label="5. SAU install"
                      onPress={() =>
                        openUrl(
                          (sau?.loginLinks ?? []).find((link) => link.url)
                            ?.url ??
                            "https://github.com/dreammis/social-auto-upload",
                        )
                      }
                    />
                    <Button
                      label="6. Copy all SAU logins"
                      onPress={() => {
                        const command =
                          (sau?.loginLinks ?? []).find((link) => link.command)
                            ?.command ?? "";
                        void handleCopyCommand(command, "SAU logins");
                      }}
                    />
                  </View>
                  {zernio?.suggestedAccountsExport ? (
                    <View style={styles.exportBlock}>
                      <Text style={sharedStyles.cardMeta}>
                        Suggested from live Zernio accounts:
                      </Text>
                      <Text style={styles.pre}>
                        {zernio.suggestedAccountsExport}
                      </Text>
                      <Button
                        label="Copy ZERNIO_ACCOUNTS_JSON export"
                        onPress={() => {
                          void handleCopyCommand(
                            zernio.suggestedAccountsExport ?? "",
                            "ZERNIO_ACCOUNTS_JSON export",
                          );
                        }}
                      />
                    </View>
                  ) : (
                    <Text style={[sharedStyles.cardMeta, styles.exportHint]}>
                      No live Zernio accounts synced yet — set ZERNIO_API_KEY on
                      the agent, connect channels in Zernio, then Sync.
                    </Text>
                  )}
                </View>
              </>
            ) : null}

            <SectionLabel>Providers</SectionLabel>
            <View style={layoutStyles.grid}>
              {zernio ? (
                <View style={layoutStyles.gridItemHalf}>
                  <ProviderCard
                    title="Zernio (English)"
                    meta={[
                      `Mode: ${zernio.mode ?? "stub"}`,
                      `API key: ${zernio.hasApiKey ? "set" : "missing"}`,
                      `suggested export: ${zernio.suggestedAccountsExport ? "ready" : "none"}`,
                    ]}
                    loginLinks={zernio.loginLinks ?? []}
                    signupSteps={zernio.signupSteps ?? []}
                    envDocs={zernio.envDocs ?? []}
                    actions={[
                      {
                        label:
                          busyAction === "sync-zernio"
                            ? "Syncing…"
                            : "Sync accounts",
                        onPress: () => {
                          void handleSyncZernio();
                        },
                        disabled: busyAction === "sync-zernio",
                      },
                      {
                        label:
                          busyAction === "test-zernio"
                            ? "Testing…"
                            : "Test connection",
                        onPress: () => {
                          void handleTest("zernio");
                        },
                        disabled: busyAction === "test-zernio",
                      },
                    ]}
                    onOpenUrl={openUrl}
                    onCopyCommand={(command, label) => {
                      void handleCopyCommand(command, label);
                    }}
                  />
                </View>
              ) : null}
              {sau ? (
                <View style={layoutStyles.gridItemHalf}>
                  <ProviderCard
                    title="social-auto-upload (China)"
                    meta={[
                      `Mode: ${sau.mode ?? "stub"}`,
                      sau.installHint || sau.dashboardHint || "",
                    ].filter(Boolean)}
                    loginLinks={sau.loginLinks ?? []}
                    signupSteps={sau.signupSteps ?? []}
                    envDocs={sau.envDocs ?? []}
                    actions={[
                      {
                        label:
                          busyAction === "test-sau"
                            ? "Testing…"
                            : "Test connection",
                        onPress: () => {
                          void handleTest("sau");
                        },
                        disabled: busyAction === "test-sau",
                      },
                    ]}
                    onOpenUrl={openUrl}
                    onCopyCommand={(command, label) => {
                      void handleCopyCommand(command, label);
                    }}
                  />
                </View>
              ) : null}
            </View>

            <SectionLabel>Zernio platforms</SectionLabel>
            <PlatformStatusGrid
              rows={zernioRows}
              onOpenUrl={openUrl}
              onTest={(platform) => {
                void handleTest(platform);
              }}
              busyAction={busyAction}
            />

            <SectionLabel>China / SAU platforms</SectionLabel>
            <PlatformStatusGrid
              rows={sauRows}
              onOpenUrl={openUrl}
              onTest={(platform) => {
                void handleTest(platform);
              }}
              onCopyLogin={(command) => {
                void handleCopyCommand(command, "Login command");
              }}
              busyAction={busyAction}
              sau
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

type ProviderCardProps = {
  title: string;
  meta: string[];
  loginLinks: LoginLink[];
  signupSteps: SignupStep[];
  envDocs: string[];
  actions: Array<{
    label: string;
    onPress: () => void;
    disabled?: boolean;
    primary?: boolean;
  }>;
  onOpenUrl: (url: string | undefined) => void;
  onCopyCommand: (command: string, label: string) => void;
};

function ProviderCard({
  title,
  meta,
  loginLinks,
  signupSteps,
  envDocs,
  actions,
  onOpenUrl,
  onCopyCommand,
}: ProviderCardProps) {
  return (
    <View style={styles.providerCard}>
      <Text style={sharedStyles.cardTitle}>{title}</Text>
      {meta.map((line) => (
        <Text key={line} style={sharedStyles.cardMeta}>
          {line}
        </Text>
      ))}
      <View style={sharedStyles.takeActions}>
        {loginLinks.map((link) =>
          link.url ? (
            <Button
              key={`${link.label}-${link.url}`}
              label={link.label}
              onPress={() => onOpenUrl(link.url)}
            />
          ) : link.command ? (
            <Button
              key={`${link.label}-cmd`}
              label={link.label}
              onPress={() => onCopyCommand(link.command ?? "", link.label)}
            />
          ) : null,
        )}
        {actions.map((action) => (
          <Button
            key={action.label}
            label={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            variant={action.primary ? "primary" : "default"}
          />
        ))}
      </View>
      {signupSteps.length ? (
        <View style={styles.steps}>
          {signupSteps.map((step) => (
            <View key={`${step.step}-${step.title}`} style={styles.step}>
              <Text style={sharedStyles.cardTitle}>{step.title}</Text>
              <Text style={sharedStyles.cardMeta}>{step.detail}</Text>
              <View style={sharedStyles.takeActions}>
                {step.url ? (
                  <Button label="Open" onPress={() => onOpenUrl(step.url)} />
                ) : null}
                {step.command ? (
                  <Button
                    label="Copy command"
                    onPress={() =>
                      onCopyCommand(step.command ?? "", step.title)
                    }
                  />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {envDocs.length ? (
        <View style={styles.envList}>
          {envDocs.map((line) => (
            <Text key={line} style={sharedStyles.codeText}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type PlatformStatusGridProps = {
  rows: PlatformStatus[];
  onOpenUrl: (url: string | undefined) => void;
  onTest: (platform: string) => void;
  onCopyLogin?: (command: string) => void;
  busyAction: string | null;
  sau?: boolean;
};

function PlatformStatusGrid({
  rows,
  onOpenUrl,
  onTest,
  onCopyLogin,
  busyAction,
  sau = false,
}: PlatformStatusGridProps) {
  const { layout } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const safeRows = rows ?? [];
  if (!safeRows.length) {
    return (
      <Text style={sharedStyles.cardMeta}>
        {sau ? "No SAU platforms" : "No Zernio platforms"}
      </Text>
    );
  }

  return (
    <View style={layoutStyles.grid}>
      {safeRows.map((entry) => (
        <View
          key={entry.platform}
          style={[styles.statusCard, layoutStyles.gridItemHalf]}
        >
          <View style={sharedStyles.cardTop}>
            <Text style={sharedStyles.cardTitle}>
              {platformLabel(entry.platform)}
            </Text>
            <Badge
              label={platformStatusLabel(entry.status)}
              filmed={
                entry.status === "connected" || entry.status === "configured"
              }
            />
          </View>
          <Text style={sharedStyles.cardMeta}>
            mode {entry.mode}
            {entry.accountMasked
              ? ` · ${entry.accountLabel ?? "account"} ${entry.accountMasked}`
              : ""}
          </Text>
          {(entry.notes ?? []).map((note) => (
            <Text key={note} style={sharedStyles.cardMeta}>
              {note}
            </Text>
          ))}
          <View style={sharedStyles.takeActions}>
            {entry.dashboardUrl ? (
              <Button
                label="Dashboard"
                onPress={() => onOpenUrl(entry.dashboardUrl ?? undefined)}
              />
            ) : null}
            {(entry.loginLinks ?? [])
              .filter((link) => link.url && link.url !== entry.dashboardUrl)
              .map((link) => (
                <Button
                  key={`${entry.platform}-${link.label}`}
                  label={link.label}
                  onPress={() => onOpenUrl(link.url)}
                />
              ))}
            {sau && entry.loginCommand && onCopyLogin ? (
              <Button
                label="Copy login"
                onPress={() => onCopyLogin(entry.loginCommand ?? "")}
              />
            ) : null}
            <Button
              label={
                busyAction === `test-${entry.platform}` ? "Testing…" : "Test"
              }
              onPress={() => onTest(entry.platform)}
              disabled={
                entry.status === "manual" ||
                busyAction === `test-${entry.platform}`
              }
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
  headerWrap: {
    flexShrink: 0,
    zIndex: 20,
  },
  pageScroll: {
    flex: 1,
    minHeight: 0,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  error: {
    color: colors.offline,
    marginBottom: spacing.md,
  },
  progressCard: {
    ...sharedStyles.card,
    gap: spacing.sm,
  },
  llmStatus: {
    color: colors.online,
    fontSize: 13,
    fontWeight: "600",
  },
  llmInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  exportBlock: {
    marginTop: 10,
    gap: spacing.sm,
  },
  exportHint: {
    marginTop: 10,
  },
  pre: {
    color: colors.code,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 12,
    backgroundColor: colors.videoBg,
    padding: spacing.sm,
    borderRadius: 8,
  },
  providerCard: {
    ...sharedStyles.card,
    gap: spacing.xs,
  },
  steps: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  step: {
    gap: spacing.xs,
  },
  envList: {
    marginTop: spacing.sm,
    gap: 4,
  },
  statusCard: {
    ...sharedStyles.card,
    gap: spacing.xs,
  },
});
