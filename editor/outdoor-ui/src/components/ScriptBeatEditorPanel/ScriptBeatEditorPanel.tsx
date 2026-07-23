export type {
  DraftBeat,
  ScriptBeatEditorPanelProps,
} from "./ScriptBeatEditorPanel.types";

import classes from "./ScriptBeatEditorPanel.module.scss";
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type {
  DraftBeat,
  ScriptBeatEditorPanelProps,
} from "./ScriptBeatEditorPanel.types";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useOutdoorUi } from "../../context/OutdoorUiContext";
import { colors, sharedStyles } from "../../theme";
import type { LiveBeat, StyleKit } from "../../types";
import { BeatEditorVisualPanel } from "../BeatEditorVisualPanel/BeatEditorVisualPanel";
import { AutoGrowTextInput } from "../AutoGrowTextInput/AutoGrowTextInput";
import { Button } from "../Button/Button";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import { draftDiffersFromBeat } from "./ScriptBeatEditorPanel.utils";

function beatPreviewLine(
  draft: DraftBeat | undefined,
  beat: LiveBeat,
  index: number,
): string {
  const say = draft?.say?.trim() || beat.say?.trim();
  if (say) {
    return say.split("\n")[0] ?? "";
  }
  return draft?.title?.trim() || beat.title || `Beat ${index + 1}`;
}

export function ScriptBeatEditorPanel({
  beats,
  drafts,
  activeIndex,
  onActiveIndexChange,
  onDraftChange,
  onSaveBeat,
  savingIndex = null,
  readOnlyMeta = true,
  hideBeatList = false,
  embedInParentScroll = false,
  footer,
  styleKit,
  beatTemplate,
  templateConfig,
  onTemplateChange,
  onTemplateConfigChange,
  scriptId,
}: ScriptBeatEditorPanelProps) {
  const {  layout } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const isBrowser = layout === "browser";
  const showBeatList = !hideBeatList;

  const clampedIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(beats.length - 1, 0),
  );
  const activeBeat = beats[clampedIndex] ?? null;
  const activeDraft = drafts[clampedIndex] ?? null;

  const selectBeat = useCallback(
    (index: number) => {
      onActiveIndexChange(index);
    },
    [onActiveIndexChange],
  );

  const goPrev = useCallback(() => {
    selectBeat(Math.max(0, clampedIndex - 1));
  }, [clampedIndex, selectBeat]);

  const goNext = useCallback(() => {
    selectBeat(Math.min(beats.length - 1, clampedIndex + 1));
  }, [beats.length, clampedIndex, selectBeat]);

  const progressLabel = !beats.length
    ? "0 / 0"
    : `${clampedIndex + 1} / ${beats.length}`;

  if (!activeBeat || !activeDraft) {
    return (
      <View style={webModuleStyle(classes.empty)}>
        <Text style={sharedStyles.mutedText}>No beats in this script yet.</Text>
      </View>
    );
  }

  const compactHeader = hideBeatList ? (
    <View style={webModuleStyle(classes.compactHeader)}>
      <Text style={webModuleStyle(classes.compactBeatLabel)}>Beat {clampedIndex + 1}</Text>
      <Text style={webModuleStyle(classes.compactProgress)}>{progressLabel}</Text>
      <TextInput
        key={`title-${clampedIndex}`}
        style={webModuleStyle(classes.compactTitleInput)}
        value={activeDraft.title}
        onChangeText={(title) => onDraftChange(clampedIndex, { title })}
        placeholder="Beat title"
        placeholderTextColor={colors.muted}
      />
      <View style={webModuleStyle(classes.inlineNav)}>
        <Button label="Prev" onPress={goPrev} disabled={clampedIndex <= 0} />
        <Button
          label="Next"
          onPress={goNext}
          disabled={clampedIndex >= beats.length - 1}
        />
        {onSaveBeat ? (
          <Button
            label={
              savingIndex === clampedIndex
                ? "Saving…"
                : `Save ${clampedIndex + 1}`
            }
            variant="primary"
            disabled={savingIndex !== null}
            onPress={() => onSaveBeat(clampedIndex)}
          />
        ) : null}
      </View>
    </View>
  ) : null;

  const useVisualPanel = styleKit != null;

  const visualBeatEditor = useVisualPanel ? (
    <BeatEditorVisualPanel
      beat={activeBeat}
      draft={activeDraft}
      beatIndex={clampedIndex}
      styleKit={styleKit}
      onDraftChange={(patch) => onDraftChange(clampedIndex, patch)}
      fillHeight={hideBeatList && !embedInParentScroll}
      template={beatTemplate}
      templateConfig={templateConfig}
      onTemplateChange={onTemplateChange}
      onTemplateConfigChange={onTemplateConfigChange}
      scriptId={scriptId}
    />
  ) : null;

  const beatFields = useVisualPanel ? (
    <>
      {visualBeatEditor}
      {readOnlyMeta && (activeBeat.hint || activeBeat.chinese) ? (
        <View style={webModuleStyle(classes.slideBox)}>
          <SectionLabel style={webModuleStyle(classes.boxLabel)}>Imported notes</SectionLabel>
          <Text style={webModuleStyle(classes.metaText)}>
            {[activeBeat.hint, activeBeat.chinese].filter(Boolean).join("\n\n")}
          </Text>
        </View>
      ) : null}
      {onSaveBeat && !hideBeatList ? (
        <View style={webModuleStyle(classes.saveRow)}>
          <Button
            label={
              savingIndex === clampedIndex
                ? "Saving…"
                : `Save beat ${clampedIndex + 1}`
            }
            variant="primary"
            disabled={savingIndex !== null}
            onPress={() => onSaveBeat(clampedIndex)}
          />
        </View>
      ) : null}
      {footer}
    </>
  ) : (
    <>
      {!hideBeatList ? (
        <>
          <View style={webModuleStyle(classes.slideHeader)}>
            <View style={webModuleStyle(classes.slideHeaderText)}>
              <Text style={webModuleStyle(classes.slideNumber)}>Beat {clampedIndex + 1}</Text>
              <Text style={webModuleStyle(classes.slideHint)} numberOfLines={1}>
                Saved to animation.md on Save beat.
              </Text>
            </View>
          </View>

          <View style={webModuleStyle(classes.slideBox)}>
            <SectionLabel style={webModuleStyle(classes.boxLabel)}>Beat title</SectionLabel>
            <TextInput
              key={`title-${clampedIndex}`}
              style={webModuleStyle(classes.titleInput)}
              value={activeDraft.title}
              onChangeText={(title) => onDraftChange(clampedIndex, { title })}
              placeholder="Short label for this beat"
              placeholderTextColor={colors.muted}
            />
          </View>
        </>
      ) : null}

      <View style={webModuleStyle(classes.slideBox)}>
        <SectionLabel style={webModuleStyle(classes.boxLabel)}>Spoken</SectionLabel>
        <AutoGrowTextInput
          key={`say-${clampedIndex}`}
          value={activeDraft.say}
          onChangeText={(say) => onDraftChange(clampedIndex, { say })}
          lineHeight={18}
          minLines={2}
          inputClassName={classes.sayInput}
          placeholder="What you say on camera for this beat"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View
        style={[webModuleStyle(classes.codeRow,
          !isBrowser ? classes.codeRowStacked : null,), isBrowser ? layoutStyles.compareRow : undefined]}
      >
        <View style={webModuleStyle(classes.slideBox, classes.codeBox)}>
          <SectionLabel style={webModuleStyle(classes.boxLabel)}>Lean</SectionLabel>
          <AutoGrowTextInput
            key={`lean-${clampedIndex}`}
            value={activeDraft.leanCode}
            onChangeText={(leanCode) =>
              onDraftChange(clampedIndex, { leanCode })
            }
            lineHeight={15}
            minLines={2}
            maxLines={8}
            nowrap
            autoCapitalize="none"
            autoCorrect={false}
            inputClassName={classes.codeInput}
            placeholder="Lean code shown on screen"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={webModuleStyle(classes.slideBox, classes.codeBox)}>
          <SectionLabel style={webModuleStyle(classes.boxLabel)}>Turn</SectionLabel>
          <AutoGrowTextInput
            key={`turn-${clampedIndex}`}
            value={activeDraft.turnCode}
            onChangeText={(turnCode) =>
              onDraftChange(clampedIndex, { turnCode })
            }
            lineHeight={15}
            minLines={2}
            maxLines={8}
            nowrap
            autoCapitalize="none"
            autoCorrect={false}
            inputClassName={classes.codeInput}
            placeholder="Turn-lang code shown on screen"
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>

      <View style={webModuleStyle(classes.slideBox)}>
        <SectionLabel style={webModuleStyle(classes.boxLabel)}>Visual notes</SectionLabel>
        <AutoGrowTextInput
          key={`notes-${clampedIndex}`}
          value={activeDraft.visualNotes}
          onChangeText={(visualNotes) =>
            onDraftChange(clampedIndex, { visualNotes })
          }
          lineHeight={16}
          minLines={2}
          inputClassName={classes.notesInput}
          placeholder="What appears on screen — layout hints, highlights, director notes"
          placeholderTextColor={colors.muted}
        />
      </View>

      {readOnlyMeta && (activeBeat.hint || activeBeat.chinese) ? (
        <View style={webModuleStyle(classes.slideBox)}>
          <SectionLabel style={webModuleStyle(classes.boxLabel)}>Imported notes</SectionLabel>
          <Text style={webModuleStyle(classes.metaText)}>
            {[activeBeat.hint, activeBeat.chinese].filter(Boolean).join("\n\n")}
          </Text>
        </View>
      ) : null}

      {onSaveBeat && !hideBeatList ? (
        <View style={webModuleStyle(classes.saveRow)}>
          <Button
            label={
              savingIndex === clampedIndex
                ? "Saving…"
                : `Save beat ${clampedIndex + 1}`
            }
            variant="primary"
            disabled={savingIndex !== null}
            onPress={() => onSaveBeat(clampedIndex)}
          />
        </View>
      ) : null}

      {footer}
    </>
  );

  const beatForm = (
    <View key={`beat-form-${clampedIndex}`} style={webModuleStyle(classes.beatForm)}>
      {compactHeader}
      {beatFields}
    </View>
  );

  return (
    <View
      style={webModuleStyle(embedInParentScroll ? classes.rootEmbedded : classes.root,
        isBrowser && showBeatList ? classes.rootBrowser : null,)}
    >
      {showBeatList ? (
        <View
          style={webModuleStyle(classes.sidebar,
            isBrowser ? classes.sidebarBrowser : classes.sidebarMobile,)}
        >
          <View style={webModuleStyle(classes.sidebarHeader)}>
            <Text style={webModuleStyle(classes.sidebarTitle)}>Beats</Text>
            <Text style={webModuleStyle(classes.sidebarCount)}>{progressLabel}</Text>
          </View>
          <ScrollView
            style={webModuleStyle(classes.sidebarScroll)}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View style={webModuleStyle(classes.sidebarBody)}>
            {beats.map((beat, index) => {
              const active = index === clampedIndex;
              const draft = drafts[index];
              const dirty = draft ? draftDiffersFromBeat(draft, beat) : false;
              return (
                <Pressable
                  key={beat.id}
                  style={webModuleStyle(classes.beatThumb,
                    active ? classes.beatThumbActive : null,)}
                  onPress={() => selectBeat(index)}
                >
                  <Text style={webModuleStyle(classes.beatThumbIndex)}>{index + 1}</Text>
                  <View style={webModuleStyle(classes.beatThumbBody)}>
                    <Text style={webModuleStyle(classes.beatThumbTitle)} numberOfLines={1}>
                      {draft?.title?.trim() ||
                        beat.title ||
                        `Beat ${index + 1}`}
                      {dirty ? " ·" : ""}
                    </Text>
                    <Text style={webModuleStyle(classes.beatThumbPreview)} numberOfLines={2}>
                      {beatPreviewLine(draft, beat, index)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            </View>
          </ScrollView>
          <View style={webModuleStyle(classes.sidebarNav)}>
            <Button
              label="Prev"
              onPress={goPrev}
              disabled={clampedIndex <= 0}
            />
            <Button
              label="Next"
              onPress={goNext}
              disabled={clampedIndex >= beats.length - 1}
            />
          </View>
        </View>
      ) : null}

      <View style={webModuleStyle(embedInParentScroll ? classes.canvasEmbedded : classes.canvas)}>
        {embedInParentScroll ? (
          beatForm
        ) : hideBeatList && useVisualPanel ? (
          <>
            {compactHeader}
            <ScrollView
              style={webModuleStyle(classes.visualCanvas)}
              contentContainerStyle={webModuleStyle(classes.visualCanvasBody)}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {visualBeatEditor}
            </ScrollView>
          </>
        ) : hideBeatList ? (
          <>
            {compactHeader}
            <ScrollView
              style={webModuleStyle(classes.canvasScroll)}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <View style={webModuleStyle(classes.canvasBody)}>
                <View key={`beat-form-${clampedIndex}`} style={webModuleStyle(classes.beatForm)}>
                  {beatFields}
                </View>
              </View>
            </ScrollView>
          </>
        ) : (
          <ScrollView
            style={webModuleStyle(classes.canvasScroll)}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <View style={webModuleStyle(classes.canvasBody)}>{beatForm}</View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
