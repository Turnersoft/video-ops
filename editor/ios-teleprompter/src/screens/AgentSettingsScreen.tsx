import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  checkAgentHealth,
  checkAgentHealthMessage,
  fetchInboxStatus,
  fetchPlatformsHealth,
  syncPostizIntegrations,
  testPlatformOrProvider,
  type ConnectProgress,
  type PlatformStatus,
} from "../agentClient";
import {
  loadAgentBaseUrl,
  readSavedAgentBaseUrl,
  saveAgentBaseUrl,
} from "../agentSettings";
import { getLinkedInboxLabel, linkIcloudInboxFolder } from "../exportInbox";
import { ICLOUD_INBOX_FOLDER } from "../icloudInboxFolder";
import {
  DEFAULT_AGENT_TAILSCALE_URL,
  DEFAULT_REMOTION_TAILSCALE_URL,
} from "../outdoorNgrokConfig";
import {
  lockdownExemptAppName,
  promptLockdownExemption,
} from "../lockdownMode";
import {
  describeEndpointSource,
  loadOutdoorEndpointsFromIcloud,
} from "../outdoorEndpoints";
import {
  loadRemotionStudioUrl,
  readSavedRemotionStudioUrl,
  remotionCompositionUrl,
  saveRemotionStudioUrl,
} from "../remotionSettings";
import { NGROK_BYPASS_HEADERS } from "../outdoorFetch";

type AgentSettingsScreenProps = {
  onBack: () => void;
};

export function AgentSettingsScreen({ onBack }: AgentSettingsScreenProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [studioUrl, setStudioUrl] = useState("");
  const [endpointSource, setEndpointSource] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [studioOnline, setStudioOnline] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [inboxLabel, setInboxLabel] = useState<string | null>(null);
  const [linkingInbox, setLinkingInbox] = useState(false);
  const [inboxStatusText, setInboxStatusText] = useState<string>(
    "Checking Mac inbox…",
  );
  const [platformEntries, setPlatformEntries] = useState<PlatformStatus[]>([]);
  const [connectProgress, setConnectProgress] = useState<ConnectProgress>({
    total: 0,
    ready: 0,
    missing: [],
    manual: [],
    stubOnly: true,
  });
  const [postizMode, setPostizMode] = useState("stub");
  const [sauMode, setSauMode] = useState("stub");
  const [postizHasKey, setPostizHasKey] = useState(false);
  const [postizSignupUrl, setPostizSignupUrl] = useState(
    "http://localhost:4007",
  );
  const [postizApiKeysUrl, setPostizApiKeysUrl] = useState(
    "http://localhost:4007/settings",
  );
  const [postizDashboardUrl, setPostizDashboardUrl] = useState(
    "http://localhost:4007",
  );
  const [postizExport, setPostizExport] = useState<string | null>(null);
  const [postizLinks, setPostizLinks] = useState<
    Array<{ label: string; url?: string; command?: string }>
  >([]);
  const [sauLinks, setSauLinks] = useState<
    Array<{ label: string; url?: string; command?: string }>
  >([]);
  const [platformsError, setPlatformsError] = useState<string | null>(null);
  const [testingTarget, setTestingTarget] = useState("");
  const [syncingPostiz, setSyncingPostiz] = useState(false);

  const refreshEndpoints = useCallback(async () => {
    const [agent, remotion, endpoints, savedAgent, savedRemotion, inbox] =
      await Promise.all([
        loadAgentBaseUrl(),
        loadRemotionStudioUrl(),
        loadOutdoorEndpointsFromIcloud(),
        readSavedAgentBaseUrl(),
        readSavedRemotionStudioUrl(),
        getLinkedInboxLabel(),
      ]);
    setBaseUrl(agent);
    setStudioUrl(remotion);
    setInboxLabel(inbox);
    const agentSource = describeEndpointSource(
      endpoints,
      savedAgent,
      "agentUrl",
    );
    const remotionSource = describeEndpointSource(
      endpoints,
      savedRemotion,
      "remotionStudioUrl",
    );
    setEndpointSource(`Agent: ${agentSource} · Remotion: ${remotionSource}`);
    try {
      const status = await fetchInboxStatus();
      const latest = status.recentIngests[0];
      const pending = status.files.filter(
        (file) => file.status === "ready" || file.status === "pending",
      );
      if (latest) {
        setInboxStatusText(
          `Mac last picked take ${latest.takeId}\nVideo: ${latest.videoFileName ?? "—"}\nPath: ${latest.videoPath ?? latest.inboxDir}${
            latest.takeDir ? `\nPost-process: ${latest.takeDir}` : ""
          }${pending.length ? `\nWaiting in inbox: ${pending.map((file) => file.takeId).join(", ")}` : ""}`,
        );
      } else {
        setInboxStatusText(
          `Mac is watching ${status.watchedFolders.length} folder(s). No ingest yet.${
            pending.length
              ? `\nWaiting: ${pending.map((file) => `${file.takeId} (${file.videoFileName ?? "no video"})`).join(", ")}`
              : ""
          }`,
        );
      }
    } catch {
      setInboxStatusText(
        "Could not read Mac inbox status (agent offline or wrong URL).",
      );
    }
    try {
      const health = await fetchPlatformsHealth();
      setPlatformEntries(health.entries);
      setConnectProgress(health.connectProgress);
      setPostizMode(health.providers.postiz.mode);
      setSauMode(health.providers.sau.mode);
      setPostizHasKey(health.providers.postiz.hasApiKey);
      setPostizSignupUrl(
        health.providers.postiz.signupUrl ?? "http://localhost:4007",
      );
      setPostizApiKeysUrl(
        health.providers.postiz.apiKeysUrl ??
          "http://localhost:4007/settings",
      );
      setPostizDashboardUrl(
        health.providers.postiz.dashboardUrl ?? "http://localhost:4007",
      );
      setPostizExport(health.providers.postiz.suggestedIntegrationsExport ?? null);
      setPostizLinks(health.providers.postiz.loginLinks ?? []);
      setSauLinks(health.providers.sau.loginLinks ?? []);
      setPlatformsError(null);
    } catch (error) {
      setPlatformEntries([]);
      setPlatformsError(
        error instanceof Error ? error.message : "Could not load platforms",
      );
    }
  }, []);

  useEffect(() => {
    void refreshEndpoints();
  }, [refreshEndpoints]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshEndpoints();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshEndpoints]);

  const testConnection = useCallback(async () => {
    await saveAgentBaseUrl(baseUrl);
    await saveRemotionStudioUrl(studioUrl);
    setSaving(true);
    const ok = await checkAgentHealth();
    setOnline(ok);
    let remotionOk = false;
    try {
      const studioResponse = await fetch(
        remotionCompositionUrl(studioUrl, "sets-v2-01-set"),
        {
          headers: NGROK_BYPASS_HEADERS,
        },
      );
      remotionOk = studioResponse.ok;
      setStudioOnline(remotionOk);
    } catch {
      setStudioOnline(false);
    }
    setSaving(false);
    if (!ok) {
      const message = await checkAgentHealthMessage();
      Alert.alert(
        "Agent unreachable",
        message ??
            "On Mac run: cd video_ops && npm run outdoor:all\n\n" +
            "Hotspot/LAN is tried first, then Tailscale. Refresh from iCloud.",
      );
    }
    if (!remotionOk) {
      Alert.alert(
        "Remotion unreachable",
        "On Mac run: cd video_ops/remotion && npm run studio:lan\n\n" +
          "Then Refresh from iCloud in Mac connection settings.\n\n" +
          "Use the Mac Tailscale URL for port 3000 (not 127.0.0.1 on iPhone).",
      );
    }
  }, [baseUrl, studioUrl]);

  const save = async () => {
    setSaving(true);
    await saveAgentBaseUrl(baseUrl);
    await saveRemotionStudioUrl(studioUrl);
    const ok = await checkAgentHealth();
    setOnline(ok);
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Mac connection</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable
          style={styles.lockdownCard}
          onPress={() => promptLockdownExemption()}
        >
          <Text style={styles.lockdownTitle}>Lockdown Mode</Text>
          <Text style={styles.hint}>
            Only if Remotion stays blank after connection works: Settings →
            Lockdown Mode → Configure Web Browsing → turn off{" "}
            {lockdownExemptAppName()}. Tap for steps.
          </Text>
        </Pressable>

        <Text style={styles.hint}>
          iPhone defaults to Mac Tailscale ({DEFAULT_AGENT_TAILSCALE_URL}), not
          localhost. URLs refresh from iCloud TurnOutdoor/outdoor-endpoints.json
          when outdoor:all runs on Mac.
        </Text>
        {endpointSource ? (
          <Text style={styles.source}>{endpointSource}</Text>
        ) : null}

        <Text style={styles.label}>Outdoor agent URL (pipeline)</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={DEFAULT_AGENT_TAILSCALE_URL}
          placeholderTextColor="#64748b"
        />
        <Text style={styles.hint}>
          Mac: cd video_ops && npm run outdoor:all
        </Text>

        <Text style={[styles.label, styles.labelSpaced]}>
          Remotion Studio URL
        </Text>
        <TextInput
          style={styles.input}
          value={studioUrl}
          onChangeText={setStudioUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={DEFAULT_REMOTION_TAILSCALE_URL}
          placeholderTextColor="#64748b"
        />
        <Text style={styles.hint}>
          Mac: cd video_ops/remotion && npm run studio:lan (syncs Tailscale URL
          to iCloud)
        </Text>

        <Text style={[styles.label, styles.labelSpaced]}>
          iCloud inbox folder
        </Text>
        <Text style={styles.hint}>
          One-time per app session: choose {ICLOUD_INBOX_FOLDER} directly, or pick the
          TurnOutdoor folder (the app creates inbox inside it). Do not pick iCloud Drive root.
        </Text>
        {inboxLabel ? (
          <Text style={styles.ok}>Linked: {inboxLabel}</Text>
        ) : null}
        <Text style={[styles.hint, styles.labelSpaced]}>
          Mac inbox checker (live)
        </Text>
        <Text style={styles.hint}>{inboxStatusText}</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setLinkingInbox(true);
            void linkIcloudInboxFolder()
              .then(() => getLinkedInboxLabel())
              .then(setInboxLabel)
              .finally(() => setLinkingInbox(false));
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {linkingInbox ? "Opening picker…" : "Choose iCloud inbox folder"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => void refreshEndpoints()}
        >
          <Text style={styles.secondaryButtonText}>Refresh from iCloud</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => void save()}>
          <Text style={styles.primaryButtonText}>
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => void testConnection()}
        >
          <Text style={styles.secondaryButtonText}>Test agent + Remotion</Text>
        </Pressable>
        {online === true ? <Text style={styles.ok}>Agent online</Text> : null}
        {online === false ? (
          <Text style={styles.error}>Agent offline</Text>
        ) : null}
        {studioOnline === true ? (
          <Text style={styles.ok}>Remotion reachable</Text>
        ) : null}
        {studioOnline === false ? (
          <Text style={styles.error}>Remotion unreachable</Text>
        ) : null}

        <Text style={[styles.label, styles.labelSpaced]}>
          Connect all platforms
        </Text>
        <Text style={styles.hint}>
          English via Postiz · China via SAU. Paste the Postiz API key on Mac #/platforms; Sync saves channel ids there.
        </Text>
        <Text style={styles.hint}>
          Progress: {connectProgress.ready}/{connectProgress.total} ready
          {connectProgress.stubOnly ? " · still stub mode" : " · live mode on"}
        </Text>
        {connectProgress.missing.length ? (
          <Text style={styles.hint}>
            Missing: {connectProgress.missing.join(", ")}
          </Text>
        ) : null}
        {connectProgress.manual.length ? (
          <Text style={styles.hint}>
            Manual only: {connectProgress.manual.join(", ")}
          </Text>
        ) : null}
        <View style={styles.platformActions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void Linking.openURL(postizSignupUrl)}
          >
            <Text style={styles.secondaryButtonText}>1. Open Postiz</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void Linking.openURL(postizApiKeysUrl)}
          >
            <Text style={styles.secondaryButtonText}>2. Create API key</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void Linking.openURL(postizDashboardUrl)}
          >
            <Text style={styles.secondaryButtonText}>
              3. Connect EN channels
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            disabled={syncingPostiz}
            onPress={() => {
              setSyncingPostiz(true);
              void syncPostizIntegrations()
                .then((result) => {
                  setPostizExport(result.exportCommand || null);
                  void Share.share({
                    message: result.exportCommand,
                    title: "POSTIZ_INTEGRATIONS_JSON",
                  });
                  Alert.alert(
                    "Synced",
                    `Mapped ${Object.keys(result.suggestedIntegrationsJson).length} channel(s). Channel ids were saved on the Mac agent (live mode).`,
                  );
                  void refreshEndpoints();
                })
                .catch((error) =>
                  Alert.alert(
                    "Sync",
                    error instanceof Error ? error.message : String(error),
                  ),
                )
                .finally(() => setSyncingPostiz(false));
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {syncingPostiz ? "Syncing…" : "4. Sync Postiz channels"}
            </Text>
          </Pressable>
          {[...postizLinks, ...sauLinks].map((link) => (
            <Pressable
              key={`${link.label}-${link.url ?? link.command}`}
              style={styles.secondaryButton}
              onPress={() => {
                if (link.url) {
                  void Linking.openURL(link.url);
                  return;
                }
                if (link.command) {
                  void Share.share({
                    message: link.command,
                    title: link.label,
                  });
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
        {postizExport ? (
          <Pressable
            onPress={() =>
              void Share.share({
                message: postizExport,
                title: "POSTIZ_INTEGRATIONS_JSON",
              })
            }
          >
            <Text style={styles.action}>
              Share suggested POSTIZ_INTEGRATIONS_JSON export
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>
            No Postiz channels synced yet — set POSTIZ_API_KEY on Mac #/platforms,
            connect channels, then Sync.
          </Text>
        )}
        <Text style={[styles.label, styles.labelSpaced]}>Provider health</Text>
        <Text style={styles.hint}>
          Postiz: {postizMode}
          {postizHasKey ? " · API key set" : " · API key missing"} · SAU:{" "}
          {sauMode}
        </Text>
        <View style={styles.platformActions}>
          <Pressable
            style={styles.secondaryButton}
            disabled={Boolean(testingTarget)}
            onPress={() => {
              setTestingTarget("postiz");
              void testPlatformOrProvider("postiz")
                .then((result) =>
                  Alert.alert(
                    result.ok ? "Postiz OK" : "Postiz failed",
                    result.message,
                  ),
                )
                .catch((error) =>
                  Alert.alert(
                    "Postiz",
                    error instanceof Error ? error.message : String(error),
                  ),
                )
                .finally(() => setTestingTarget(""));
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {testingTarget === "postiz" ? "Testing…" : "Test Postiz"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            disabled={Boolean(testingTarget)}
            onPress={() => {
              setTestingTarget("sau");
              void testPlatformOrProvider("sau")
                .then((result) =>
                  Alert.alert(
                    result.ok ? "SAU OK" : "SAU failed",
                    result.message,
                  ),
                )
                .catch((error) =>
                  Alert.alert(
                    "SAU",
                    error instanceof Error ? error.message : String(error),
                  ),
                )
                .finally(() => setTestingTarget(""));
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {testingTarget === "sau" ? "Testing…" : "Test SAU"}
            </Text>
          </Pressable>
        </View>
        {platformsError ? (
          <Text style={styles.error}>{platformsError}</Text>
        ) : null}
        {platformEntries.map((entry) => (
          <View key={entry.platform} style={styles.platformRow}>
            <View style={styles.platformMeta}>
              <Text style={styles.platformName}>{entry.platform}</Text>
              <Text style={styles.platformStatus}>
                {entry.provider} · {entry.mode} · {entry.status}
                {entry.accountMasked ? ` · ${entry.accountMasked}` : ""}
              </Text>
              {entry.notes?.[0] ? (
                <Text style={styles.hint}>{entry.notes[0]}</Text>
              ) : null}
              {entry.loginCommand ? (
                <Pressable
                  onPress={() =>
                    void Share.share({
                      message: entry.loginCommand!,
                      title: `${entry.platform} login`,
                    })
                  }
                >
                  <Text style={styles.action}>Share login command</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.platformSideActions}>
              {(entry.loginLinks || [])
                .filter((link) => link.url)
                .map((link) => (
                  <Pressable
                    key={link.label}
                    onPress={() => void Linking.openURL(link.url!)}
                  >
                    <Text style={styles.link}>{link.label}</Text>
                  </Pressable>
                ))}
              {entry.status !== "manual" ? (
                <Pressable
                  onPress={() => {
                    setTestingTarget(entry.platform);
                    void testPlatformOrProvider(entry.platform)
                      .then((result) =>
                        Alert.alert(
                          result.ok ? "OK" : "Failed",
                          result.message,
                        ),
                      )
                      .catch((error) =>
                        Alert.alert(
                          entry.platform,
                          error instanceof Error
                            ? error.message
                            : String(error),
                        ),
                      )
                      .finally(() => setTestingTarget(""));
                  }}
                >
                  <Text style={styles.action}>
                    {testingTarget === entry.platform ? "…" : "Test"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  back: { color: "#f97316", fontWeight: "800", fontSize: 16 },
  title: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  body: { padding: 16, gap: 12 },
  lockdownCard: {
    backgroundColor: "rgba(127, 29, 29, 0.35)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
    padding: 14,
    gap: 6,
  },
  lockdownTitle: { color: "#fecaca", fontSize: 15, fontWeight: "800" },
  label: { color: "#cbd5e1", fontSize: 14, fontWeight: "700" },
  labelSpaced: { marginTop: 8 },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { color: "#94a3b8", fontSize: 14, lineHeight: 20 },
  source: { color: "#38bdf8", fontSize: 13, fontWeight: "700" },
  primaryButton: {
    backgroundColor: "#f97316",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#111827", fontWeight: "800", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#f8fafc", fontWeight: "800", fontSize: 15 },
  ok: { color: "#4ade80", fontWeight: "700" },
  error: { color: "#f87171", fontWeight: "700" },
  platformActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  platformRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    padding: 12,
  },
  platformMeta: { flex: 1, gap: 2 },
  platformName: { color: "#f8fafc", fontWeight: "800", fontSize: 14 },
  platformStatus: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  platformSideActions: { gap: 8, alignItems: "flex-end" },
  action: { color: "#f97316", fontWeight: "800", fontSize: 13, paddingTop: 2 },
  link: { color: "#38bdf8", fontWeight: "700", fontSize: 12 },
});
