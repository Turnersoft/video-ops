export type { TemplateConfigPanelProps } from "./TemplateConfigPanel.types";

import classes from "./TemplateConfigPanel.module.scss";
import { webModuleStyle, webClassName } from "../../utils/webClassName";
import type { TemplateConfigPanelProps } from "./TemplateConfigPanel.types";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme";
import type {
  BeatTemplateConfig,
  BeatTemplateKind,
  BeatPlacementKind,
  BeatPlacementSpec,
  ScreenRecordingConfig,
  CodeBlockEdit,
  CodeBlockOp,
  CompositedConfig,
  StickerSpec,
} from "../../types/beatStudio";
import {
  MANIM_SUB_TEMPLATES,
  DEFAULT_MANIM_WEB_CODE,
  ensureScreenRecordingSyncCuts,
  normalizeTemplateConfig,
} from "../../utils/beatTemplateRegistry";
import { MANIM_DIAGRAM_IDS } from "../../utils/manimDiagramCatalog";
import { AutoGrowTextInput } from "../AutoGrowTextInput/AutoGrowTextInput";
import { SectionLabel } from "../SectionLabel/SectionLabel";

import { StickerEditor } from "./StickerEditor";

export function TemplateConfigPanel({
  scriptId,
  template,
  templateConfig,
  onChange,
}: TemplateConfigPanelProps) {
  const normalized = normalizeTemplateConfig(template, templateConfig);
  if (normalized.kind !== template) {
    return null;
  }

  switch (normalized.kind) {
    case "compare-dual":
      return renderCompareDual(normalized, onChange);
    case "turn-focus":
      return renderTurnFocus(normalized, onChange);
    case "manim-motion":
      return renderManimMotion(normalized, onChange);
    case "composited":
      return renderComposited(scriptId, normalized, onChange);
    case "presenter-overlay":
      return renderPresenterOverlay(normalized, onChange);
    case "screen-recording":
      return renderScreenRecording(normalized, onChange);
    case "stickers":
      return renderStickers(scriptId, normalized, onChange);
    default: {
      const _exhaustive: never = normalized;
      return _exhaustive;
    }
  }
}

function renderCompareDual(
  templateConfig: Extract<BeatTemplateConfig, { kind: "compare-dual" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  return (
    <View style={webModuleStyle(classes.stack)}>
      <View style={webModuleStyle(classes.row)}>
        <ConfigToggle
          label="Lean"
          active={cfg.leanEnabled}
          onPress={() =>
            patchCompare(cfg, onChange, { leanEnabled: !cfg.leanEnabled })
          }
        />
        <ConfigToggle
          label="Turn"
          active={cfg.turnEnabled}
          onPress={() =>
            patchCompare(cfg, onChange, { turnEnabled: !cfg.turnEnabled })
          }
        />
        <ConfigToggle
          label="Lean render"
          active={cfg.leanRender}
          onPress={() =>
            patchCompare(cfg, onChange, { leanRender: !cfg.leanRender })
          }
        />
        <ConfigToggle
          label="Turn render"
          active={cfg.turnRender}
          onPress={() =>
            patchCompare(cfg, onChange, { turnRender: !cfg.turnRender })
          }
        />
        <ConfigToggle
          label="Typing"
          active={cfg.typing.enabled}
          onPress={() =>
            patchCompare(cfg, onChange, {
              typing: { ...cfg.typing, enabled: !cfg.typing.enabled },
            })
          }
        />
      </View>
      <View style={webModuleStyle(classes.row)}>
        {(["default", "minimal", "textbook"] as const).map((style) => (
          <ConfigToggle
            key={style}
            label={`Lean ${style}`}
            active={cfg.leanEditorStyle === style}
            onPress={() =>
              patchCompare(cfg, onChange, { leanEditorStyle: style })
            }
          />
        ))}
      </View>
      <View style={webModuleStyle(classes.row)}>
        {(["ide", "minimal"] as const).map((style) => (
          <ConfigToggle
            key={style}
            label={`Turn ${style}`}
            active={cfg.turnEditorStyle === style}
            onPress={() =>
              patchCompare(cfg, onChange, { turnEditorStyle: style })
            }
          />
        ))}
      </View>
      {cfg.typing.enabled ? (
        <View style={webModuleStyle(classes.row)}>
          <LabeledInput
            label="Typing CPS"
            value={String(cfg.typing.cps ?? 24)}
            keyboardType="numeric"
            onChangeText={(raw) => {
              const n = Number(raw);
              if (!Number.isNaN(n) && n > 0)
                patchCompare(cfg, onChange, {
                  typing: { ...cfg.typing, cps: n },
                });
            }}
          />
          <LabeledInput
            label="Pause after (s)"
            value={String(cfg.typing.pauseAfterSeconds ?? 0.3)}
            keyboardType="numeric"
            onChangeText={(raw) => {
              const n = Number(raw);
              if (!Number.isNaN(n) && n >= 0)
                patchCompare(cfg, onChange, {
                  typing: { ...cfg.typing, pauseAfterSeconds: n },
                });
            }}
          />
        </View>
      ) : null}
      <CodeBlockEditsEditor
        edits={cfg.codeBlockEdits}
        onChange={(codeBlockEdits) =>
          patchCompare(cfg, onChange, { codeBlockEdits })
        }
      />
    </View>
  );
}

function patchCompare(
  cfg: Extract<BeatTemplateConfig, { kind: "compare-dual" }>["config"],
  onChange: TemplateConfigPanelProps["onChange"],
  patch: Partial<typeof cfg>,
) {
  onChange({ kind: "compare-dual", config: { ...cfg, ...patch } });
}

function renderTurnFocus(
  templateConfig: Extract<BeatTemplateConfig, { kind: "turn-focus" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  return (
    <View style={webModuleStyle(classes.row)}>
      <ConfigToggle
        label="Render"
        active={cfg.renderEnabled}
        onPress={() =>
          onChange({
            kind: "turn-focus",
            config: { ...cfg, renderEnabled: !cfg.renderEnabled },
          })
        }
      />
      <ConfigToggle
        label="Typing"
        active={cfg.typing.enabled}
        onPress={() =>
          onChange({
            kind: "turn-focus",
            config: {
              ...cfg,
              typing: { ...cfg.typing, enabled: !cfg.typing.enabled },
            },
          })
        }
      />
    </View>
  );
}

function renderManimMotion(
  templateConfig: Extract<BeatTemplateConfig, { kind: "manim-motion" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  return (
    <View style={webModuleStyle(classes.stack)}>
      <View style={webModuleStyle(classes.row)}>
        {MANIM_SUB_TEMPLATES.map((sub) => (
          <ConfigToggle
            key={sub}
            label={sub.replace(/-/g, " ")}
            active={cfg.subTemplate === sub}
            onPress={() =>
              onChange({
                kind: "manim-motion",
                config: { ...cfg, subTemplate: sub },
              })
            }
          />
        ))}
      </View>
      <View style={webModuleStyle(classes.row)}>
        {MANIM_DIAGRAM_IDS.map((diagramId) => (
          <ConfigToggle
            key={diagramId}
            label={diagramId}
            active={cfg.diagramId === diagramId}
            onPress={() =>
              onChange({ kind: "manim-motion", config: { ...cfg, diagramId } })
            }
          />
        ))}
      </View>
      <LabeledInput
        label="Diagram id (custom)"
        value={cfg.diagramId ?? ""}
        placeholder="set-container"
        onChangeText={(diagramId) =>
          onChange({
            kind: "manim-motion",
            config: { ...cfg, diagramId: diagramId || undefined },
          })
        }
      />
      <LabeledInput
        label="Duration (s)"
        value={String(cfg.durationSeconds)}
        keyboardType="numeric"
        onChangeText={(raw) => {
          const n = Number(raw);
          if (!Number.isNaN(n) && n > 0)
            onChange({
              kind: "manim-motion",
              config: { ...cfg, durationSeconds: n },
            });
        }}
      />
      <LabeledInput
        label="Caption"
        value={cfg.caption ?? ""}
        onChangeText={(caption) =>
          onChange({
            kind: "manim-motion",
            config: { ...cfg, caption: caption || undefined },
          })
        }
      />
      <View style={webModuleStyle(classes.codeEditorSection)}>
        <View style={webModuleStyle(classes.editRowHeader)}>
          <SectionLabel style={webModuleStyle(classes.inputLabel)}>
            Manim-web code
          </SectionLabel>
          <Pressable
            onPress={() =>
              onChange({
                kind: "manim-motion",
                config: { ...cfg, manimWebCode: DEFAULT_MANIM_WEB_CODE },
              })
            }
          >
            <Text style={webModuleStyle(classes.codeEditorAction)}>Load example</Text>
          </Pressable>
        </View>
        <AutoGrowTextInput
          value={cfg.manimWebCode ?? ""}
          onChangeText={(manimWebCode) =>
            onChange({
              kind: "manim-motion",
              config: { ...cfg, manimWebCode: manimWebCode || undefined },
            })
          }
          lineHeight={16}
          minLines={8}
          maxLines={24}
          nowrap
          inputClassName={classes.codeEditor}
          placeholder={DEFAULT_MANIM_WEB_CODE}
          placeholderTextColor={colors.muted}
        />
        <Text style={webModuleStyle(classes.codeEditorHint)}>
          Async body using scene and manim exports (Create, Circle, …). Overrides diagram preset when set.
        </Text>
      </View>
    </View>
  );
}

function renderComposited(
  scriptId: string,
  templateConfig: Extract<BeatTemplateConfig, { kind: "composited" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  const patch = (next: Partial<CompositedConfig>) =>
    onChange({ kind: "composited", config: { ...cfg, ...next } });

  return (
    <View style={webModuleStyle(classes.stack)}>
      <SectionLabel style={webModuleStyle(classes.inputLabel)}>
        Base footage (back layer)
      </SectionLabel>
      <LabeledInput
        label="Footage path"
        value={cfg.baseFootageSrc ?? ""}
        placeholder="assets/footage/presenter.mp4"
        onChangeText={(baseFootageSrc) =>
          patch({ baseFootageSrc: baseFootageSrc || undefined })
        }
      />
      <View style={webModuleStyle(classes.row)}>
        {(["cover", "contain"] as const).map((fit) => (
          <ConfigToggle
            key={fit}
            label={fit}
            active={(cfg.baseObjectFit ?? "cover") === fit}
            onPress={() => patch({ baseObjectFit: fit })}
          />
        ))}
      </View>
      <LabeledInput
        label="Footage label"
        value={cfg.baseLabel ?? ""}
        onChangeText={(baseLabel) => patch({ baseLabel: baseLabel || undefined })}
      />
      <SectionLabel style={webModuleStyle(classes.inputLabel)}>
        Front placements
      </SectionLabel>
      <View style={webModuleStyle(classes.row)}>
        <ConfigToggle
          label="+ Placement"
          active={false}
          onPress={() => {
            const placement: BeatPlacementSpec = {
              id: `p-${Date.now().toString(36)}`,
              kind: "sticker",
              text: "New placement",
              atSeconds: cfg.placements.length * 1.5,
              durationSeconds: 3,
              x: 0.72,
              y: 0.08,
              width: 0.24,
              enter: "scale",
            };
            patch({ placements: [...cfg.placements, placement] });
          }}
        />
      </View>
      {cfg.placements.map((placement, index) => (
        <View key={placement.id} style={webModuleStyle(classes.editRow)}>
          <View style={webModuleStyle(classes.editRowHeader)}>
            <Text style={webModuleStyle(classes.editRowTitle)}>
              Placement {index + 1}
            </Text>
            <DeleteButton
              onPress={() =>
                patch({
                  placements: cfg.placements.filter((_, i) => i !== index),
                })
              }
            />
          </View>
          <View style={webModuleStyle(classes.row)}>
            {(["sticker", "image", "video", "manim"] as BeatPlacementKind[]).map(
              (kind) => (
                <ConfigToggle
                  key={kind}
                  label={kind}
                  active={placement.kind === kind}
                  onPress={() =>
                    patch({
                      placements: cfg.placements.map((entry, i) =>
                        i === index ? { ...entry, kind } : entry,
                      ),
                    })
                  }
                />
              ),
            )}
          </View>
          {placement.kind === "sticker" || placement.kind === "image" ? (
            <StickerEditor
              scriptId={scriptId}
              sticker={placementToSticker(placement)}
              index={index}
              onChange={(sticker) => {
                const placements = cfg.placements.map((entry, i) =>
                  i === index
                    ? placementFromSticker(entry, sticker)
                    : entry,
                );
                onChange({ kind: "composited", config: { ...cfg, placements } });
              }}
              onDelete={() =>
                patch({
                  placements: cfg.placements.filter((_, i) => i !== index),
                })
              }
            />
          ) : (
            <>
              <LabeledInput
                label="Asset src"
                value={placement.src ?? ""}
                onChangeText={(src) =>
                  patch({
                    placements: cfg.placements.map((entry, i) =>
                      i === index ? { ...entry, src: src || undefined } : entry,
                    ),
                  })
                }
              />
              {placement.kind === "manim" ? (
                <LabeledInput
                  label="Diagram id"
                  value={placement.diagramId ?? ""}
                  onChangeText={(diagramId) =>
                    patch({
                      placements: cfg.placements.map((entry, i) =>
                        i === index
                          ? { ...entry, diagramId: diagramId || undefined }
                          : entry,
                      ),
                    })
                  }
                />
              ) : null}
              <View style={webModuleStyle(classes.row)}>
                <LabeledInput
                  compact
                  label="@s"
                  value={String(placement.atSeconds)}
                  keyboardType="numeric"
                  onChangeText={(raw) => {
                    const n = Number(raw);
                    if (!Number.isNaN(n) && n >= 0) {
                      patch({
                        placements: cfg.placements.map((entry, i) =>
                          i === index ? { ...entry, atSeconds: n } : entry,
                        ),
                      });
                    }
                  }}
                />
                <LabeledInput
                  compact
                  label="Dur (s)"
                  value={String(placement.durationSeconds)}
                  keyboardType="numeric"
                  onChangeText={(raw) => {
                    const n = Number(raw);
                    if (!Number.isNaN(n) && n > 0) {
                      patch({
                        placements: cfg.placements.map((entry, i) =>
                          i === index ? { ...entry, durationSeconds: n } : entry,
                        ),
                      });
                    }
                  }}
                />
              </View>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function placementToSticker(placement: BeatPlacementSpec): StickerSpec {
  return {
    id: placement.id,
    text: placement.text ?? "",
    emoji: placement.emoji,
    assetPath: placement.src,
    atSeconds: placement.atSeconds,
    durationSeconds: placement.durationSeconds,
    position: "center",
    x: placement.x,
    y: placement.y,
    width: placement.width,
  };
}

function placementFromSticker(
  placement: BeatPlacementSpec,
  sticker: StickerSpec,
): BeatPlacementSpec {
  return {
    ...placement,
    kind: sticker.assetPath ? "image" : "sticker",
    text: sticker.text,
    emoji: sticker.emoji,
    src: sticker.assetPath,
    atSeconds: sticker.atSeconds,
    durationSeconds: sticker.durationSeconds,
    x: sticker.x ?? placement.x,
    y: sticker.y ?? placement.y,
    width: sticker.width ?? placement.width,
  };
}

function renderPresenterOverlay(
  templateConfig: Extract<BeatTemplateConfig, { kind: "presenter-overlay" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  return (
    <View style={webModuleStyle(classes.stack)}>
      <View style={webModuleStyle(classes.row)}>
        {(["foreground", "mid", "background"] as const).map((depth) => (
          <ConfigToggle
            key={depth}
            label={depth}
            active={cfg.depth === depth}
            onPress={() =>
              onChange({ kind: "presenter-overlay", config: { ...cfg, depth } })
            }
          />
        ))}
      </View>
      <View style={webModuleStyle(classes.row)}>
        {(["center", "left", "right", "lower-third"] as const).map((anchor) => (
          <ConfigToggle
            key={anchor}
            label={anchor}
            active={cfg.anchor === anchor}
            onPress={() =>
              onChange({
                kind: "presenter-overlay",
                config: { ...cfg, anchor },
              })
            }
          />
        ))}
      </View>
      <LabeledInput
        label="Asset path"
        value={cfg.assetPath ?? ""}
        onChangeText={(assetPath) =>
          onChange({
            kind: "presenter-overlay",
            config: { ...cfg, assetPath: assetPath || undefined },
          })
        }
      />
      <LabeledInput
        label="Animation id"
        value={cfg.animationId ?? ""}
        onChangeText={(animationId) =>
          onChange({
            kind: "presenter-overlay",
            config: { ...cfg, animationId: animationId || undefined },
          })
        }
      />
    </View>
  );
}

function renderScreenRecording(
  templateConfig: Extract<BeatTemplateConfig, { kind: "screen-recording" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  const syncCuts = ensureScreenRecordingSyncCuts(cfg.syncCuts);

  const pushConfig = (next: ScreenRecordingConfig) => {
    onChange({
      kind: "screen-recording",
      config: { ...next, syncCuts: ensureScreenRecordingSyncCuts(next.syncCuts) },
    });
  };

  return (
    <View style={webModuleStyle(classes.stack)}>
      <View style={webModuleStyle(classes.row)}>
        <ConfigToggle
          label="Audio only"
          active={cfg.audioOnly}
          onPress={() =>
            pushConfig({ ...cfg, syncCuts, audioOnly: !cfg.audioOnly })
          }
        />
      </View>
      <LabeledInput
        label="Screen recording"
        value={cfg.screenTrackPath ?? ""}
        placeholder="assets/recordings/my-capture.mp4"
        onChangeText={(screenTrackPath) =>
          pushConfig({
            ...cfg,
            syncCuts,
            screenTrackPath: screenTrackPath || undefined,
          })
        }
      />
      <LabeledInput
        label="Camera (optional)"
        value={cfg.cameraTrackPath ?? ""}
        placeholder="assets/recordings/camera.mp4"
        onChangeText={(cameraTrackPath) =>
          pushConfig({
            ...cfg,
            syncCuts,
            cameraTrackPath: cameraTrackPath || undefined,
          })
        }
      />
      <SectionLabel style={webModuleStyle(classes.inputLabel)}>
        Sync cut
      </SectionLabel>
      {syncCuts.map((cut, index) => (
        <View
          key={`${cut.atSeconds}-${index}`}
          style={webModuleStyle(classes.editRow)}
        >
          <View style={webModuleStyle(classes.editRowHeader)}>
            <Text style={webModuleStyle(classes.editRowTitle)}>
              {syncCuts.length > 1 ? `Cut ${index + 1}` : "Beat sync point"}
            </Text>
            {syncCuts.length > 1 ? (
              <DeleteButton
                onPress={() => {
                  pushConfig({
                    ...cfg,
                    syncCuts: syncCuts.filter((_, i) => i !== index),
                  });
                }}
              />
            ) : null}
          </View>
          <View style={webModuleStyle(classes.row)}>
            <LabeledInput
              compact
              label="@s"
              value={String(cut.atSeconds)}
              keyboardType="numeric"
              onChangeText={(raw) => {
                const n = Number(raw);
                if (!Number.isNaN(n) && n >= 0) {
                  pushConfig({
                    ...cfg,
                    syncCuts: syncCuts.map((entry, i) =>
                      i === index ? { ...entry, atSeconds: n } : entry,
                    ),
                  });
                }
              }}
            />
            <LabeledInput
              compact
              label="Label"
              value={cut.label ?? ""}
              onChangeText={(label) => {
                pushConfig({
                  ...cfg,
                  syncCuts: syncCuts.map((entry, i) =>
                    i === index
                      ? { ...entry, label: label || undefined }
                      : entry,
                  ),
                });
              }}
            />
          </View>
        </View>
      ))}
      <View style={webModuleStyle(classes.row)}>
        <ConfigToggle
          label="+ Add cut"
          active={false}
          onPress={() => {
            pushConfig({
              ...cfg,
              syncCuts: [
                ...syncCuts,
                {
                  atSeconds: syncCuts.length * 2,
                  label: `Cut ${syncCuts.length + 1}`,
                },
              ],
            });
          }}
        />
      </View>
    </View>
  );
}

function renderStickers(
  scriptId: string,
  templateConfig: Extract<BeatTemplateConfig, { kind: "stickers" }>,
  onChange: TemplateConfigPanelProps["onChange"],
) {
  const cfg = templateConfig.config;
  return (
    <View style={webModuleStyle(classes.stack)}>
      <View style={webModuleStyle(classes.row)}>
        <ConfigToggle
          label="+ Sticker"
          active={false}
          onPress={() => {
            const sticker: StickerSpec = {
              id: `s-${Date.now().toString(36)}`,
              text: "New sticker",
              atSeconds: cfg.stickers.length * 1.5,
              durationSeconds: 2,
              position: "top-right",
            };
            onChange({
              kind: "stickers",
              config: { stickers: [...cfg.stickers, sticker] },
            });
          }}
        />
      </View>
      {cfg.stickers.map((sticker, index) => (
        <StickerEditor
          key={sticker.id}
          scriptId={scriptId}
          sticker={sticker}
          index={index}
          onChange={(next) => {
            const stickers = cfg.stickers.map((entry, i) =>
              i === index ? next : entry,
            );
            onChange({ kind: "stickers", config: { stickers } });
          }}
          onDelete={() =>
            onChange({
              kind: "stickers",
              config: { stickers: cfg.stickers.filter((_, i) => i !== index) },
            })
          }
        />
      ))}
    </View>
  );
}

function CodeBlockEditsEditor({
  edits,
  onChange,
}: {
  edits: CodeBlockEdit[];
  onChange: (edits: CodeBlockEdit[]) => void;
}) {
  const addEdit = (op: CodeBlockOp) => {
    const edit: CodeBlockEdit = {
      id: `e-${Date.now().toString(36)}`,
      op,
      atSeconds: edits.length * 1.5,
      language: "turn",
      before: op === "insert" ? undefined : "",
      after: op === "delete" ? undefined : "",
    };
    onChange([...edits, edit]);
  };

  return (
    <View style={webModuleStyle(classes.stack)}>
      <View style={webModuleStyle(classes.row)}>
        <ConfigToggle
          label="+ Insert"
          active={false}
          onPress={() => addEdit("insert")}
        />
        <ConfigToggle
          label="+ Update"
          active={false}
          onPress={() => addEdit("update")}
        />
        <ConfigToggle
          label="+ Delete"
          active={false}
          onPress={() => addEdit("delete")}
        />
        <ConfigToggle
          label="+ Transform"
          active={false}
          onPress={() => addEdit("transform")}
        />
      </View>
      {edits.map((edit, index) => (
        <View key={edit.id} style={webModuleStyle(classes.editRow)}>
          <View style={webModuleStyle(classes.editRowHeader)}>
            <Text style={webModuleStyle(classes.editRowTitle)}>
              {edit.op} · {edit.language} @ {edit.atSeconds}s
            </Text>
            <DeleteButton
              onPress={() => onChange(edits.filter((_, i) => i !== index))}
            />
          </View>
          <View style={webModuleStyle(classes.row)}>
            <LabeledInput
              label="@s"
              value={String(edit.atSeconds)}
              keyboardType="numeric"
              onChangeText={(raw) => {
                const n = Number(raw);
                if (!Number.isNaN(n) && n >= 0)
                  onChange(
                    edits.map((entry, i) =>
                      i === index ? { ...entry, atSeconds: n } : entry,
                    ),
                  );
              }}
            />
            <ConfigToggle
              label="Lean"
              active={edit.language === "lean"}
              onPress={() =>
                onChange(
                  edits.map((entry, i) =>
                    i === index
                      ? { ...entry, language: "lean" as const }
                      : entry,
                  ),
                )
              }
            />
            <ConfigToggle
              label="Turn"
              active={edit.language === "turn"}
              onPress={() =>
                onChange(
                  edits.map((entry, i) =>
                    i === index
                      ? { ...entry, language: "turn" as const }
                      : entry,
                  ),
                )
              }
            />
          </View>
          {edit.op !== "insert" ? (
            <LabeledInput
              label="Before"
              value={edit.before ?? ""}
              onChangeText={(before) =>
                onChange(
                  edits.map((entry, i) =>
                    i === index ? { ...entry, before } : entry,
                  ),
                )
              }
            />
          ) : null}
          {edit.op !== "delete" ? (
            <LabeledInput
              label="After"
              value={edit.after ?? ""}
              onChangeText={(after) =>
                onChange(
                  edits.map((entry, i) =>
                    i === index ? { ...entry, after } : entry,
                  ),
                )
              }
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ConfigToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={webModuleStyle(
        classes.toggle,
        active ? classes.toggleActive : null,
      )}
    >
      <Text
        style={webModuleStyle(
          classes.toggleText,
          active ? classes.toggleTextActive : null,
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DeleteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={webModuleStyle(classes.deleteBtn)}
    >
      <Text style={webModuleStyle(classes.deleteBtnText)}>×</Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  placeholder,
  keyboardType,
  compact = false,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  compact?: boolean;
  onChangeText: (text: string) => void;
}) {
  return (
    <View
      style={webModuleStyle(
        classes.inputWrap,
        compact ? classes.inputWrapCompact : null,
      )}
    >
      <SectionLabel style={webModuleStyle(classes.inputLabel)}>
        {label}
      </SectionLabel>
      <AutoGrowTextInput
        value={value}
        onChangeText={onChangeText}
        lineHeight={16}
        minLines={1}
        maxLines={keyboardType === "numeric" ? 1 : 3}
        inputClassName={classes.input}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
      />
    </View>
  );
}
