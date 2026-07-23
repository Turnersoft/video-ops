export type { BeatEditorVisualPanelProps } from "./BeatEditorVisualPanel.types";

import classes from "./BeatEditorVisualPanel.module.scss";
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { BeatEditorVisualPanelProps } from "./BeatEditorVisualPanel.types";
import { Text, View } from "react-native";

import { colors } from "../../theme";
import type { BeatTemplateKind } from "../../types/beatStudio";
import {
  classifyBeatVisual,
  type BeatVisualKind,
} from "../../utils/beatVisual";
import { BEAT_TEMPLATE_REGISTRY } from "../../utils/beatTemplateRegistry";
import { AutoGrowTextInput } from "../AutoGrowTextInput/AutoGrowTextInput";
import { BeatTemplateSwitcher } from "../BeatTemplateSwitcher/BeatTemplateSwitcher";
import { KIT_CHROME, kindAccent } from "../kitThemes/kitThemes";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import { TemplateConfigPanel } from "../TemplateConfigPanel/TemplateConfigPanel";

const CODE_MAX_LINES = 12;

export function BeatEditorVisualPanel({
  beat,
  draft,
  beatIndex,
  styleKit,
  onDraftChange,
  fillHeight = false,
  template,
  templateConfig,
  onTemplateChange,
  onTemplateConfigChange,
  scriptId,
}: BeatEditorVisualPanelProps) {
  const visualKind = classifyBeatVisual(beat, styleKit);
  const templateKind = template ?? mapVisualToTemplate(visualKind);
  const templateDef = BEAT_TEMPLATE_REGISTRY[templateKind];
  const chrome = KIT_CHROME[styleKit];
  const accent = kindAccent(visualKind, chrome.accent);

  return (
    <View
      style={webModuleStyle(classes.root, fillHeight ? classes.rootFill : null)}
    >
      <View
        style={[webModuleStyle(classes.kindBanner), { borderColor: accent, backgroundColor: chrome.accentSoft }]}
      >
        <Text style={[webModuleStyle(classes.kindLabel), { color: accent }]}>
          {templateDef.shortLabel.toUpperCase()}
        </Text>
        <Text style={webModuleStyle(classes.kindMeta)}>
          {templateDef.label} · beat {beatIndex + 1}
        </Text>
      </View>
      <SpokenField
        draft={draft}
        onDraftChange={onDraftChange}
        compact={fillHeight}
      />
      {onTemplateChange ? (
        <BeatTemplateSwitcher
          value={templateKind}
          onChange={onTemplateChange}
        />
      ) : null}
      {templateConfig && onTemplateConfigChange && scriptId ? (
        <TemplateConfigPanel
          scriptId={scriptId}
          template={templateKind}
          templateConfig={templateConfig}
          onChange={onTemplateConfigChange}
        />
      ) : null}
      <View
        style={webModuleStyle(classes.body, fillHeight ? classes.bodyFill : null)}
      >
        {renderTemplateBody(
          templateKind,
          draft,
          onDraftChange,
          fillHeight,
          templateConfig,
        )}
      </View>
    </View>
  );
}

function mapVisualToTemplate(kind: BeatVisualKind): BeatTemplateKind {
  switch (kind) {
    case "compare":
      return "compare-dual";
    case "code":
    case "terminal":
      return "turn-focus";
    case "hero":
    case "still":
      return "composited";
    case "meme":
    case "quote":
      return "composited";
    case "news":
    case "reject":
      return "turn-focus";
    case "chapter":
      return "manim-motion";
    default:
      return "compare-dual";
  }
}

function renderTemplateBody(
  template: BeatTemplateKind,
  draft: BeatEditorVisualPanelProps["draft"],
  onDraftChange: BeatEditorVisualPanelProps["onDraftChange"],
  fillHeight: boolean,
  templateConfig?: BeatEditorVisualPanelProps["templateConfig"],
) {
  switch (template) {
    case "compare-dual":
      return renderKindBody("compare", draft, onDraftChange, fillHeight);
    case "turn-focus":
      return (
        <>
          <CodePane
            label="Turn"
            value={draft.turnCode}
            onChangeText={(turnCode) => onDraftChange({ turnCode })}
            fill={fillHeight}
            maxLines={fillHeight ? CODE_MAX_LINES + 4 : CODE_MAX_LINES}
          />
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={fillHeight}
          />
        </>
      );
    case "manim-motion":
      return (
        <>
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={false}
            label="Motion brief"
            minLines={fillHeight ? 5 : 3}
          />
          {templateConfig?.kind === "manim-motion" ? (
            <Text style={webModuleStyle(classes.configHint)}>
              Sub-template: {templateConfig.config.subTemplate}
              {templateConfig.config.diagramId
                ? ` · ${templateConfig.config.diagramId}`
                : ""}
              {templateConfig.config.manimWebCode?.trim()
                ? " · manim-web code"
                : ""}
            </Text>
          ) : null}
        </>
      );
    case "presenter-overlay":
    case "composited":
      return (
        <>
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={false}
            label="Footage / overlay notes"
            minLines={fillHeight ? 4 : 3}
          />
        </>
      );
    case "screen-recording":
      return (
        <>
          <NotesField draft={draft} onDraftChange={onDraftChange} compact={fillHeight} />
        </>
      );
    case "stickers":
      return renderKindBody("meme", draft, onDraftChange, fillHeight);
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

function renderKindBody(
  kind: BeatVisualKind,
  draft: BeatEditorVisualPanelProps["draft"],
  onDraftChange: BeatEditorVisualPanelProps["onDraftChange"],
  fillHeight: boolean,
) {
  switch (kind) {
    case "compare":
      return (
        <>
          <View
            style={webModuleStyle(classes.dualRow,
              fillHeight ? classes.dualRowFill : null,)}
          >
            <CodePane
              label="Lean"
              value={draft.leanCode}
              onChangeText={(leanCode) => onDraftChange({ leanCode })}
              fill={fillHeight}
            />
            <View style={webModuleStyle(classes.dualDivider)} />
            <CodePane
              label="Turn"
              value={draft.turnCode}
              onChangeText={(turnCode) => onDraftChange({ turnCode })}
              fill={fillHeight}
            />
          </View>
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={fillHeight}
          />
        </>
      );
    case "code":
    case "terminal":
      return (
        <>
          <CodePane
            label={draft.turnCode.trim() ? "Turn" : "Lean / Turn"}
            value={draft.turnCode.trim() ? draft.turnCode : draft.leanCode}
            onChangeText={(code) =>
              onDraftChange(
                draft.turnCode.trim() ? { turnCode: code } : { leanCode: code },
              )
            }
            fill={fillHeight}
            maxLines={fillHeight ? CODE_MAX_LINES + 4 : CODE_MAX_LINES}
          />
          {!draft.turnCode.trim() ? (
            <CodePane
              label="Turn (optional)"
              value={draft.turnCode}
              onChangeText={(turnCode) => onDraftChange({ turnCode })}
              fill={false}
              maxLines={6}
            />
          ) : null}
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={fillHeight}
          />
        </>
      );
    case "meme":
    case "quote":
    case "still":
      return (
        <NotesField
          draft={draft}
          onDraftChange={onDraftChange}
          compact={fillHeight}
          label="Visual direction"
          minLines={fillHeight ? 4 : 3}
        />
      );
    case "hero":
      return (
        <View
          style={webModuleStyle(classes.heroPane,
            fillHeight ? classes.heroPaneFill : null,)}
        >
          <Text style={webModuleStyle(classes.heroMark)}>▶</Text>
          <SectionLabel className={classes.boxLabel}>Hero moment</SectionLabel>
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={false}
            label="Visual"
            minLines={fillHeight ? 5 : 3}
          />
        </View>
      );
    case "news":
    case "reject":
      return (
        <>
          <View
            style={webModuleStyle(classes.heroPane,
              fillHeight ? classes.heroPaneFill : null,)}
          >
            <SectionLabel className={classes.boxLabel}>
              {kind === "news" ? "Headline / claim" : "Verdict beat"}
            </SectionLabel>
            <NotesField
              draft={draft}
              onDraftChange={onDraftChange}
              compact
              label="Card layout"
            />
          </View>
          <CodePane
            label="Turn (optional)"
            value={draft.turnCode}
            onChangeText={(turnCode) => onDraftChange({ turnCode })}
            fill={false}
            maxLines={6}
          />
        </>
      );
    case "chapter":
      return (
        <>
          <CodePane
            label="Lean"
            value={draft.leanCode}
            onChangeText={(leanCode) => onDraftChange({ leanCode })}
            fill={fillHeight}
          />
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={fillHeight}
          />
        </>
      );
    case "generic":
    default:
      return (
        <>
          <View
            style={webModuleStyle(classes.dualRow,
              fillHeight ? classes.dualRowFill : null,)}
          >
            <CodePane
              label="Lean"
              value={draft.leanCode}
              onChangeText={(leanCode) => onDraftChange({ leanCode })}
              fill={fillHeight}
            />
            <View style={webModuleStyle(classes.dualDivider)} />
            <CodePane
              label="Turn"
              value={draft.turnCode}
              onChangeText={(turnCode) => onDraftChange({ turnCode })}
              fill={fillHeight}
            />
          </View>
          <NotesField
            draft={draft}
            onDraftChange={onDraftChange}
            compact={fillHeight}
          />
        </>
      );
  }
}

type FieldProps = {
  draft: BeatEditorVisualPanelProps["draft"];
  onDraftChange: BeatEditorVisualPanelProps["onDraftChange"];
  compact?: boolean;
  label?: string;
  minLines?: number;
};

function SpokenField({ draft, onDraftChange, compact }: FieldProps) {
  return (
    <View
      style={webModuleStyle(classes.fieldBox,
        compact ? classes.fieldBoxCompact : null,)}
    >
      <SectionLabel className={classes.boxLabel}>Spoken</SectionLabel>
      <AutoGrowTextInput
        value={draft.say}
        onChangeText={(say) => onDraftChange({ say })}
        lineHeight={18}
        minLines={compact ? 2 : 3}
        maxLines={compact ? 6 : 8}
        inputClassName={classes.sayInput}
        placeholder="What you say on camera for this beat"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function NotesField({
  draft,
  onDraftChange,
  compact,
  label = "Visual notes",
  minLines = 2,
}: FieldProps) {
  return (
    <View
      style={webModuleStyle(classes.fieldBox,
        compact ? classes.fieldBoxCompact : null,)}
    >
      <SectionLabel className={classes.boxLabel}>{label}</SectionLabel>
      <AutoGrowTextInput
        value={draft.visualNotes}
        onChangeText={(visualNotes) => onDraftChange({ visualNotes })}
        lineHeight={16}
        minLines={minLines}
        maxLines={compact ? 5 : 8}
        inputClassName={classes.notesInput}
        placeholder="What appears on screen — layout hints, highlights, director notes"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

type CodePaneProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  fill?: boolean;
  maxLines?: number;
};

function CodePane({
  label,
  value,
  onChangeText,
  fill = false,
  maxLines = CODE_MAX_LINES,
}: CodePaneProps) {
  return (
    <View
      style={webModuleStyle(classes.codePane, fill ? classes.codePaneFill : null)}
    >
      <SectionLabel className={classes.boxLabel}>{label}</SectionLabel>
      <AutoGrowTextInput
        value={value}
        onChangeText={onChangeText}
        lineHeight={15}
        minLines={fill ? 4 : 2}
        maxLines={maxLines}
        nowrap
        autoCapitalize="none"
        autoCorrect={false}
        inputClassName={classes.codeInput}
        placeholder={`${label} shown on screen`}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}
