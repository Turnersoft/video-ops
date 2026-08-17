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
  PostizOverview,
  PublishCredentialsPublic,
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
  const [publishCreds, setPublishCreds] = useState<PublishCredentialsPublic | null>(
    null,
  );
  const [postizApiKeyDraft, setPostizApiKeyDraft] = useState("");
  const [postizApiBaseDraft, setPostizApiBaseDraft] = useState(
    "http://localhost:4007/api/public/v1",
  );
  const [postizDashboardDraft, setPostizDashboardDraft] = useState(
    "http://localhost:4007",
  );
  const [postizOverview, setPostizOverview] =
    useState<PostizOverview | null>(null);
  const [postizLive, setPostizLive] = useState(false);
  const [sauLive, setSauLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, llm, publish, overview] = await Promise.all([
        api.getPlatformsHealth(),
        api.getLlmSettings().catch(() => null),
        api.getPublishCredentials().catch(() => null),
        api.getPostizOverview().catch(() => null),
      ]);
      setHealth(next);
      if (llm) {
        setLlmBaseUrl(llm.baseUrl);
        setLlmModel(llm.model ?? "");
        setLlmStatus(`Local AI · updated ${llm.updatedAt}`);
      }
      if (publish) {
        setPublishCreds(publish);
        setPostizLive(publish.postizPublishMode === "live");
        setSauLive(publish.sauPublishMode === "live");
        setPostizApiBaseDraft(publish.postizApiBase);
        setPostizDashboardDraft(publish.postizDashboardUrl);
      }
      setPostizOverview(overview);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const handleSavePublish = useCallback(async () => {
    setBusyAction("save-publish");
    try {
      const saved = await api.putPublishCredentials({
        postizApiKey: postizApiKeyDraft.trim() || undefined,
        postizApiBase: postizApiBaseDraft.trim(),
        postizDashboardUrl: postizDashboardDraft.trim(),
        postizPublishMode: postizLive ? "live" : "stub",
        sauPublishMode: sauLive ? "live" : "stub",
      });
      setPublishCreds(saved);
      setPostizApiKeyDraft("");
      setPostizLive(saved.postizPublishMode === "live");
      setSauLive(saved.sauPublishMode === "live");
      if (postizLive && saved.hasPostizApiKey) {
        try {
          await api.syncPostizIntegrations();
        } catch (syncError) {
          Alert.alert(
            "Postiz sync",
            syncError instanceof Error ? syncError.message : String(syncError),
          );
        }
      }
      Alert.alert(
        "Publish credentials",
        saved.hasPostizApiKey
          ? `Saved${saved.postizApiKeyHint ? ` (${saved.postizApiKeyHint})` : ""}. Applied without restart.`
          : "Modes saved. Paste a Postiz API key to enable Sync.",
      );
      await load();
    } catch (saveError) {
      Alert.alert(
        "Publish credentials",
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setBusyAction(null);
    }
  }, [
    api,
    load,
    postizApiBaseDraft,
    postizApiKeyDraft,
    postizDashboardDraft,
    postizLive,
    sauLive,
  ]);

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

  const handleSyncPostiz = useCallback(async () => {
    setBusyAction("sync-postiz");
    try {
      const result = await api.syncPostizIntegrations();
      const count = Object.keys(
        result.suggestedIntegrationsJson ??
          result.suggestedAccountsJson ??
          {},
      ).length;
      if (count) {
        Alert.alert(
          "Postiz synced",
          result.applied
            ? `Saved ${count} channel(s) and set Postiz to live. No shell restart needed.`
            : `Synced ${count} channel(s).`,
        );
      } else {
        Alert.alert("Postiz sync", "Sync returned no accounts.");
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

  const handleConnectPostiz = useCallback(
    async (platform: string, refreshIntegrationId?: string) => {
      setBusyAction(`connect-${platform}`);
      try {
        const result = await api.getPostizConnectUrl(
          platform,
          refreshIntegrationId,
        );
        await Linking.openURL(result.url);
        Alert.alert(
          `${platformLabel(platform)} OAuth opened`,
          "Complete sign-in, return here, then press Sync channels. Outdoor will become the source of truth after Sync.",
        );
      } catch (connectError) {
        Alert.alert(
          `Connect ${platformLabel(platform)}`,
          connectError instanceof Error
            ? connectError.message
            : String(connectError),
        );
      } finally {
        setBusyAction(null);
      }
    },
    [api],
  );

  const handleSelectPostiz = useCallback(
    async (platform: string, integrationId: string) => {
      setBusyAction(`select-${integrationId}`);
      try {
        await api.selectPostizIntegration(platform, integrationId);
        await load();
        Alert.alert(
          "Postiz channel selected",
          `${platformLabel(platform)} will publish through this channel.`,
        );
      } catch (selectError) {
        Alert.alert(
          "Select Postiz channel",
          selectError instanceof Error
            ? selectError.message
            : String(selectError),
        );
      } finally {
        setBusyAction(null);
      }
    },
    [api, load],
  );

  const handleTest = useCallback(
    async (target: string) => {
      setBusyAction(`test-${target}`);
      try {
        const result = await api.testPlatformOrProvider(target);
        Alert.alert(result.ok ? "OK" : "Failed", result.message || "");
        await load();
      } catch (testError) {
        Alert.alert(
          "Test failed",
          testError instanceof Error ? testError.message : String(testError),
        );
      } finally {
        setBusyAction(null);
      }
    },
    [api, load],
  );

  const postiz = health?.providers.postiz;
  const sau = health?.providers.sau;
  const platforms = health?.entries ?? health?.platforms ?? [];
  const postizRows = platforms.filter((entry) => entry.provider === "postiz");
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
          title="Platform connections"
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
              Global connection console — this is not tied to any project.
              Connect and inspect Postiz here; project Social Setup only enables
              channels that are signed in and synced. Checked {fmtDate(health.checkedAt)}
            </Text>

            <SectionLabel>Postiz API connection</SectionLabel>
            <View style={styles.progressCard}>
              <Text style={sharedStyles.cardMeta}>
                {publishCreds?.hasPostizApiKey
                  ? `Postiz key on agent: ${publishCreds.postizApiKeyHint ?? "set"} · ${publishCreds.postizIntegrationCount} channel id(s)`
                  : "Paste your Postiz API key here after creating it in the local dashboard."}
              </Text>
              <Text
                style={
                  postizOverview?.apiConnected
                    ? styles.llmStatus
                    : sharedStyles.cardMeta
                }
              >
                {postizOverview?.message ??
                  "Save the API key, then Refresh to inspect Postiz."}
              </Text>
              <TextInput
                style={styles.llmInput}
                value={postizApiKeyDraft}
                onChangeText={setPostizApiKeyDraft}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder={
                  publishCreds?.hasPostizApiKey
                    ? "Leave blank to keep existing key"
                    : "POSTIZ_API_KEY"
                }
                placeholderTextColor={colors.muted}
              />
              <Text style={sharedStyles.cardMeta}>Postiz Public API base</Text>
              <TextInput
                style={styles.llmInput}
                value={postizApiBaseDraft}
                onChangeText={setPostizApiBaseDraft}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://localhost:4007/api/public/v1"
                placeholderTextColor={colors.muted}
              />
              <Text style={sharedStyles.cardMeta}>Optional Postiz dashboard</Text>
              <TextInput
                style={styles.llmInput}
                value={postizDashboardDraft}
                onChangeText={setPostizDashboardDraft}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://localhost:4007"
                placeholderTextColor={colors.muted}
              />
              <View style={sharedStyles.takeActions}>
                <Button
                  label={postizLive ? "Postiz: live" : "Postiz: stub"}
                  onPress={() => setPostizLive((value) => !value)}
                  variant={postizLive ? "primary" : undefined}
                />
                <Button
                  label={sauLive ? "SAU: live" : "SAU: stub"}
                  onPress={() => setSauLive((value) => !value)}
                  variant={sauLive ? "primary" : undefined}
                />
                <Button
                  label={
                    busyAction === "save-publish" ? "Saving…" : "Save credentials"
                  }
                  onPress={() => {
                    void handleSavePublish();
                  }}
                  disabled={busyAction === "save-publish"}
                  variant="primary"
                />
              </View>
            </View>

            <SectionLabel>
              Connected Postiz channels · {postizOverview?.integrations.length ?? 0}
            </SectionLabel>
            <Text style={sharedStyles.cardMeta}>
              These are read directly from Postiz. Project publish cards are
              enabled only after a channel appears here, is synced, and Postiz
              mode is live.
            </Text>
            <PostizChannelGrid
              overview={postizOverview}
              selectedIntegrations={
                publishCreds?.postizIntegrationsJson ?? {}
              }
              busyAction={busyAction}
              onSelect={(platform, integrationId) => {
                void handleSelectPostiz(platform, integrationId);
              }}
              onReconnect={(platform, integrationId) => {
                void handleConnectPostiz(platform, integrationId);
              }}
              onOpenDashboard={() =>
                openUrl(
                  postizOverview?.dashboardUrl ??
                    postiz?.dashboardUrl ??
                    "http://localhost:4007",
                )
              }
            />

            {progress ? (
              <>
                <SectionLabel>
                  Connect all · {progress.ready}/{progress.total} ready
                </SectionLabel>
                <View style={styles.progressCard}>
                  <Text style={sharedStyles.cardMeta}>
                    {progress.stubOnly
                      ? "Publish modes are still stub — save credentials with live toggles after logins."
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
                      label="1. Open Postiz"
                      onPress={() =>
                        openUrl(
                          postiz?.signupUrl ?? "http://localhost:4007",
                        )
                      }
                      variant="primary"
                    />
                    <Button
                      label="2. Create API key"
                      onPress={() =>
                        openUrl(
                          postiz?.apiKeysUrl ??
                            postiz?.dashboardUrl ??
                            "https://postiz.com/dashboard/api-keys",
                        )
                      }
                    />
                    <Button
                      label="3. Connect EN accounts"
                      onPress={() =>
                        openUrl(
                          postiz?.connectGuideUrl ??
                            postiz?.dashboardUrl ??
                            "https://postiz.com/dashboard",
                        )
                      }
                    />
                    <Button
                      label={
                        busyAction === "sync-postiz"
                          ? "Syncing…"
                          : "4. Sync Postiz channels"
                      }
                      onPress={() => {
                        void handleSyncPostiz();
                      }}
                      disabled={busyAction === "sync-postiz"}
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
                  {postiz?.suggestedIntegrationsExport ? (
                    <View style={styles.exportBlock}>
                      <Text style={sharedStyles.cardMeta}>
                        Suggested from live Postiz channels:
                      </Text>
                      <Text style={styles.pre}>
                        {postiz.suggestedIntegrationsExport}
                      </Text>
                      <Button
                        label="Copy POSTIZ_INTEGRATIONS_JSON export"
                        onPress={() => {
                          void handleCopyCommand(
                            postiz.suggestedIntegrationsExport ?? "",
                            "POSTIZ_INTEGRATIONS_JSON export",
                          );
                        }}
                      />
                    </View>
                  ) : (
                    <Text style={[sharedStyles.cardMeta, styles.exportHint]}>
                      No Postiz channels synced yet — paste API key above, connect
                      channels in Postiz, then Sync (auto-saves + goes live).
                    </Text>
                  )}
                </View>
              </>
            ) : null}

            <SectionLabel>Providers</SectionLabel>
            <View style={layoutStyles.grid}>
              {postiz ? (
                <View style={layoutStyles.gridItemHalf}>
                  <ProviderCard
                    title="Postiz (English)"
                    meta={[
                      `Mode: ${postiz.mode ?? "stub"}`,
                      `API key: ${postiz.hasApiKey ? "set" : "missing"}`,
                      `suggested export: ${postiz.suggestedIntegrationsExport ? "ready" : "none"}`,
                    ]}
                    loginLinks={postiz.loginLinks ?? []}
                    signupSteps={postiz.signupSteps ?? []}
                    envDocs={postiz.envDocs ?? []}
                    actions={[
                      {
                        label:
                          busyAction === "sync-postiz"
                            ? "Syncing…"
                            : "Sync accounts",
                        onPress: () => {
                          void handleSyncPostiz();
                        },
                        disabled: busyAction === "sync-postiz",
                      },
                      {
                        label:
                          busyAction === "test-postiz"
                            ? "Testing…"
                            : "Test connection",
                        onPress: () => {
                          void handleTest("postiz");
                        },
                        disabled: busyAction === "test-postiz",
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

            <SectionLabel>Postiz platforms</SectionLabel>
            <PlatformStatusGrid
              rows={postizRows}
              onOpenUrl={openUrl}
              onConnect={(platform) => {
                void handleConnectPostiz(platform);
              }}
              onTest={(platform) => {
                void handleTest(platform);
              }}
              busyAction={busyAction}
            />

            <SectionLabel>Postiz publish activity</SectionLabel>
            <PostizActivity overview={postizOverview} onOpenUrl={openUrl} />

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

            <SectionLabel>Local AI (LM Studio)</SectionLabel>
            <Text style={sharedStyles.cardMeta}>
              Separate global setting: the Mac agent calls this
              OpenAI-compatible server for animation.md edits.
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

function PostizChannelGrid({
  overview,
  selectedIntegrations,
  busyAction,
  onSelect,
  onReconnect,
  onOpenDashboard,
}: {
  overview: PostizOverview | null;
  selectedIntegrations: Record<string, string>;
  busyAction: string | null;
  onSelect: (platform: string, integrationId: string) => void;
  onReconnect: (platform: string, integrationId: string) => void;
  onOpenDashboard: () => void;
}) {
  const { layout } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  if (!overview?.apiConnected) {
    return (
      <View style={styles.progressCard}>
        <Text style={sharedStyles.cardMeta}>
          {overview?.message ?? "Postiz API status unavailable."}
        </Text>
      </View>
    );
  }
  if (!overview.integrations.length) {
    return (
      <View style={styles.progressCard}>
        <Text style={sharedStyles.cardMeta}>
          No signed-in Postiz channels. Use Connect on a platform below.
        </Text>
        <Button label="Open Postiz (optional)" onPress={onOpenDashboard} />
      </View>
    );
  }
  return (
    <View style={layoutStyles.grid}>
      {overview.integrations.map((integration) => {
        const platform = integration.outdoorPlatform;
        const selected = Boolean(
          platform && selectedIntegrations[platform] === integration.id,
        );
        return (
          <View
            key={integration.id}
            style={[styles.statusCard, layoutStyles.gridItemHalf]}
          >
            <View style={sharedStyles.cardTop}>
              <Text style={sharedStyles.cardTitle}>
                {platformLabel(platform ?? integration.identifier)}
              </Text>
              <Badge
                label={selected ? "active for publish" : "signed in"}
                filmed={selected}
              />
            </View>
            <Text style={sharedStyles.cardMeta}>
              {integration.name || "Unnamed channel"} · {integration.identifier}
            </Text>
            {integration.settings?.maxLength ? (
              <Text style={sharedStyles.cardMeta}>
                Max caption: {integration.settings.maxLength} characters
              </Text>
            ) : null}
            {integration.settings?.rules ? (
              <Text style={styles.ruleText} numberOfLines={4}>
                {integration.settings.rules}
              </Text>
            ) : null}
            {integration.settings?.tools.length ? (
              <Text style={sharedStyles.cardMeta}>
                Postiz tools:{" "}
                {integration.settings.tools
                  .map((tool) => tool.methodName)
                  .join(", ")}
              </Text>
            ) : null}
            {integration.settingsError ? (
              <Text style={styles.error}>
                Settings: {integration.settingsError}
              </Text>
            ) : null}
            <View style={sharedStyles.takeActions}>
              {platform ? (
                <Button
                  label={
                    selected
                      ? "Active channel"
                      : busyAction === `select-${integration.id}`
                        ? "Selecting…"
                        : "Use for publishing"
                  }
                  onPress={() => onSelect(platform, integration.id)}
                  disabled={
                    selected || busyAction === `select-${integration.id}`
                  }
                  variant={selected ? "primary" : undefined}
                />
              ) : null}
              {platform ? (
                <Button
                  label={
                    busyAction === `connect-${platform}`
                      ? "Opening…"
                      : "Reconnect OAuth"
                  }
                  onPress={() => onReconnect(platform, integration.id)}
                  disabled={busyAction === `connect-${platform}`}
                />
              ) : null}
              <Button label="Open Postiz (optional)" onPress={onOpenDashboard} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PostizActivity({
  overview,
  onOpenUrl,
}: {
  overview: PostizOverview | null;
  onOpenUrl: (url: string | undefined) => void;
}) {
  if (!overview?.apiConnected) {
    return (
      <Text style={sharedStyles.cardMeta}>
        Connect the Postiz API to see queue, published/error states, and notifications.
      </Text>
    );
  }
  return (
    <View style={styles.progressCard}>
      {(overview.errors ?? []).map((error) => (
        <Text key={error} style={styles.error}>
          {error}
        </Text>
      ))}
      <Text style={sharedStyles.cardTitle}>Recent posts</Text>
      {overview.recentPosts.length ? (
        overview.recentPosts.slice(0, 10).map((post) => (
          <View key={post.id} style={styles.activityRow}>
            <View style={styles.activityText}>
              <Text style={sharedStyles.cardMeta} numberOfLines={2}>
                {post.integration?.name ||
                  post.integration?.identifier ||
                  "Postiz"}{" "}
                · {post.state}
              </Text>
              <Text style={styles.ruleText} numberOfLines={2}>
                {post.content || "(no text)"}
              </Text>
              {post.publishDate ? (
                <Text style={sharedStyles.cardMeta}>
                  {fmtDate(post.publishDate)}
                </Text>
              ) : null}
            </View>
            {post.releaseURL ? (
              <Button
                label="Open post"
                onPress={() => onOpenUrl(post.releaseURL ?? undefined)}
              />
            ) : null}
          </View>
        ))
      ) : (
        <Text style={sharedStyles.cardMeta}>No recent Postiz posts.</Text>
      )}
      <Text style={sharedStyles.cardTitle}>Notifications</Text>
      {overview.notifications.length ? (
        overview.notifications.slice(0, 8).map((notification) => (
          <View key={notification.id} style={styles.activityRow}>
            <View style={styles.activityText}>
              <Text style={styles.ruleText}>{notification.content}</Text>
              <Text style={sharedStyles.cardMeta}>
                {fmtDate(notification.createdAt)}
              </Text>
            </View>
            {notification.link ? (
              <Button
                label="Open"
                onPress={() => onOpenUrl(notification.link ?? undefined)}
              />
            ) : null}
          </View>
        ))
      ) : (
        <Text style={sharedStyles.cardMeta}>No Postiz notifications.</Text>
      )}
    </View>
  );
}

type PlatformStatusGridProps = {
  rows: PlatformStatus[];
  onOpenUrl: (url: string | undefined) => void;
  onTest: (platform: string) => void;
  onConnect?: (platform: string) => void;
  onCopyLogin?: (command: string) => void;
  busyAction: string | null;
  sau?: boolean;
};

function PlatformStatusGrid({
  rows,
  onOpenUrl,
  onTest,
  onConnect,
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
        {sau ? "No SAU platforms" : "No Postiz platforms"}
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
            {entry.provider === "postiz" &&
            entry.status !== "connected" &&
            entry.status !== "configured" &&
            onConnect ? (
              <Button
                label={
                  busyAction === `connect-${entry.platform}`
                    ? "Opening OAuth…"
                    : "Connect"
                }
                onPress={() => onConnect(entry.platform)}
                disabled={busyAction === `connect-${entry.platform}`}
                variant="primary"
              />
            ) : null}
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
  ruleText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
  },
  activityText: {
    flex: 1,
    gap: 2,
  },
});
