export type { BeatPosterSlideProps } from './BeatPosterSlide.types';

import classes from './BeatPosterSlide.module.scss';
import type { BeatPosterSlideProps } from './BeatPosterSlide.types';
import { createElement, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';

import { beatPosterBrandLogoUrl } from '../../utils/beatPosterBrandLogos';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import { highlightCodeLines } from '../../utils/beatPosterCodeHighlight';
import type { HighlightToken } from '../../utils/beatPosterCodeHighlight';
import {
  BEAT_POSTER_PREVIEW_FONT_SCALE,
  MIN_EDITOR_FONT_SIZE,
} from '../../../../../src/beatPosterLayout';
import {
  proofGoalKicker,
  proofMoveDisplay,
  proofStepKindLabel,
  proofUsesKicker,
} from '../../../../../src/beatPosterProof';
import type {
  BeatPosterProofStep,
  ProofContextFlap,
  ProofDisplayMark,
  ProofDisplaySpan,
  ProofGoalCardView,
} from '../../../../../src/beatPosterProof';

function tokenClass(dialect: 'lean' | 'turn', kind: HighlightToken['kind']): string | null {
  if (dialect === 'lean') {
    switch (kind) {
      case 'keyword':
        return classes.kwLean;
      case 'tactic':
        return classes.taLean;
      case 'type':
        return classes.tyLean;
      case 'operator':
        return classes.opLean;
      case 'string':
        return classes.stLean;
      case 'comment':
        return classes.cmLean;
      default:
        return classes.plainLean;
    }
  }
  switch (kind) {
    case 'structure':
      return classes.srTurn;
    case 'keyword':
      return classes.kwTurn;
    case 'tactic':
      return classes.taTurn;
    case 'operator':
      return classes.opTurn;
    case 'decorator':
      return classes.dcTurn;
    case 'string':
      return classes.stTurn;
    case 'comment':
      return classes.cmTurn;
    default:
      return classes.plainTurn;
  }
}

function RichInlineText({
  text,
  richClassName = classes.textCardRich,
}: {
  text: string;
  richClassName?: string;
}) {
  const parts = text.split(/(`[^`]+`)/g);
  if (Platform.OS === 'web') {
    return createElement(
      'span',
      { className: webClassName(richClassName) },
      ...parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return createElement(
            'code',
            { key: `code-${index}`, className: webClassName(classes.inlineCode) },
            part.slice(1, -1),
          );
        }
        return part;
      }),
    );
  }
  return (
    <Text>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <Text key={`code-${index}`} style={webModuleStyle(classes.inlineCode)}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={`text-${index}`}>{part}</Text>;
      })}
    </Text>
  );
}

function CodeEditorPane({
  label,
  dialect,
  code,
  lines,
  editorFontSize,
  autoHeight = false,
}: {
  label: string;
  dialect: 'lean' | 'turn';
  code: string;
  lines: number;
  editorFontSize: number;
  autoHeight?: boolean;
}) {
  if (!code.trim()) {
    return null;
  }
  const logoUrl = beatPosterBrandLogoUrl(dialect);
  const highlighted = highlightCodeLines(code, dialect, 64);
  const paneHeaderClass = dialect === 'lean' ? classes.paneHeaderDark : classes.paneHeaderLight;
  return (
    <View style={webModuleStyle(classes.editorWrap)}>
      <View style={webModuleStyle(classes.editorTitleRow)}>
        {Platform.OS === 'web'
          ? createElement('img', {
              src: logoUrl,
              alt: label,
              className: webClassName(
                classes.editorTitleLogo,
                dialect === 'lean' ? classes.leanTitleLogo : classes.turnTitleLogo,
              ),
            })
          : null}
        {Platform.OS === 'web'
          ? createElement('span', { className: webClassName(classes.editorTitleLabel) }, label)
          : <Text style={webModuleStyle(classes.editorTitleLabel)}>{label}</Text>}
      </View>
      <View style={webModuleStyle(classes.editorShell)}>
        <View
          style={webModuleStyle(
            classes.codeSection,
            dialect === 'lean' ? classes.codeSectionDark : classes.codeSectionLight,
          )}
        >
          <View style={webModuleStyle(classes.paneHeader)}>
            <Text style={webModuleStyle(classes.paneHeaderLabel, paneHeaderClass)}>Code</Text>
            <Text style={webModuleStyle(classes.paneHeaderMeta, paneHeaderClass)}>
              {lines} lines
            </Text>
          </View>
          <View
            style={[
              webModuleStyle(
                classes.editorBody,
                autoHeight ? null : classes.editorBodyExpand,
              ),
              { fontSize: Math.max(editorFontSize, MIN_EDITOR_FONT_SIZE) * BEAT_POSTER_PREVIEW_FONT_SCALE },
            ]}
          >
            {highlighted.map((lineTokens, lineIndex) => (
              <View key={`${dialect}-${lineIndex}`} style={webModuleStyle(classes.codeLine)}>
                <Text
                  style={webModuleStyle(
                    classes.lineNo,
                    dialect === 'lean' ? classes.lineNoDark : classes.lineNoLight,
                  )}
                >
                  {lineIndex + 1}
                </Text>
                {Platform.OS === 'web'
                  ? createElement(
                      'span',
                      { className: webClassName(classes.lineText) },
                      ...lineTokens.map((token, tokenIndex) =>
                        createElement(
                          'span',
                          {
                            key: `${lineIndex}-${tokenIndex}`,
                            className: webClassName(tokenClass(dialect, token.kind)),
                          },
                          token.text,
                        ),
                      ),
                    )
                  : (
                    <Text style={webModuleStyle(classes.lineText)}>
                      {lineTokens.map((token, tokenIndex) => (
                        <Text
                          key={`${lineIndex}-${tokenIndex}`}
                          style={webModuleStyle(tokenClass(dialect, token.kind))}
                        >
                          {token.text}
                        </Text>
                      ))}
                    </Text>
                  )}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function proofDom(
  tag: 'div' | 'span',
  className: string | null,
  children: ReactNode,
  key?: string,
) {
  if (Platform.OS === 'web') {
    return createElement(tag, { key, className: webClassName(className) }, children);
  }
  return (
    <Text key={key} style={webModuleStyle(className)}>
      {children}
    </Text>
  );
}

function proofMarkClass(mark: ProofDisplayMark): string | null {
  switch (mark) {
    case 'plain':
      return null;
    case 'dim':
      return classes.proofDim;
    case 'changed':
      return classes.proofChanged;
    case 'used':
      return classes.proofUsed;
    default: {
      const _never: never = mark;
      return _never;
    }
  }
}

function ProofGoalLine({
  spans,
  closed = false,
}: {
  spans: ProofDisplaySpan[];
  closed?: boolean;
}) {
  if (spans.length === 0) {
    return null;
  }
  if (Platform.OS === 'web') {
    return createElement(
      'div',
      {
        className: webClassName(
          classes.proofGoalText,
          closed ? classes.proofAfterClosed : null,
        ),
      },
      ...spans.map((span, index) =>
        createElement(
          'span',
          {
            key: `g-${index}`,
            className: webClassName(proofMarkClass(span.mark)),
          },
          span.text,
        ),
      ),
    );
  }
  return (
    <Text style={webModuleStyle(classes.proofGoalText, closed ? classes.proofAfterClosed : null)}>
      {spans.map((span, index) => (
        <Text key={`g-${index}`} style={webModuleStyle(proofMarkClass(span.mark))}>
          {span.text}
        </Text>
      ))}
    </Text>
  );
}

function ProofFlap({ flap }: { flap: ProofContextFlap }) {
  return (
    <View
      style={webModuleStyle(
        classes.proofFlap,
        flap.stacked ? classes.proofFlapStacked : classes.proofFlapCurrent,
      )}
    >
      <ProofGoalLine spans={[{ text: flap.text, mark: flap.mark }]} />
    </View>
  );
}

function ProofGoalCard({
  view,
  kicker,
  variant,
}: {
  view: ProofGoalCardView;
  kicker: string;
  variant: 'before' | 'after' | 'closed';
}) {
  if (view.flaps.length === 0 && view.claim.length === 0) {
    return null;
  }
  const cardClass = variant === 'closed'
    ? classes.proofGoalCardClosed
    : variant === 'after'
      ? classes.proofGoalCardAfter
      : null;
  return (
    <View style={webModuleStyle(classes.proofGoalCard, cardClass)}>
      {proofDom('div', classes.proofGoalKicker, kicker)}
      {view.flaps.length > 0
        ? (
          <View style={webModuleStyle(classes.proofRolodex)}>
            {view.flaps.map((flap, index) => (
              <ProofFlap key={`flap-${index}`} flap={flap} />
            ))}
          </View>
        )
        : null}
      <View style={webModuleStyle(classes.proofClaimFace)}>
        {view.closed ? null : proofDom('span', classes.proofTurnstile, '⊢')}
        <ProofGoalLine spans={view.claim} closed={view.closed} />
      </View>
    </View>
  );
}

function ProofMoveBlock({
  step,
  isLastMove,
  lang,
}: {
  step: BeatPosterProofStep;
  isLastMove: boolean;
  lang: 'en' | 'zh';
}) {
  const view = proofMoveDisplay(step, isLastMove);
  const afterVariant = view.after.closed ? 'closed' : 'after';
  return (
    <View style={webModuleStyle(classes.proofMove)}>
      <ProofGoalCard
        view={view.before}
        kicker={proofGoalKicker(lang, 'before')}
        variant="before"
      />
      <View style={webModuleStyle(classes.proofTactic)}>
        {proofDom('div', classes.proofStepLabel, step.label)}
        {view.usedOutsideGoal.length > 0
          ? (
            <View style={webModuleStyle(classes.proofUsesRow)}>
              {proofDom('span', classes.proofUsesKicker, proofUsesKicker(lang))}
              {view.usedOutsideGoal.map((name) => (
                proofDom('span', classes.proofUsesChip, name, name)
              ))}
            </View>
          )
          : null}
      </View>
      <ProofGoalCard
        view={view.after}
        kicker={proofGoalKicker(lang, 'after')}
        variant={afterVariant}
      />
    </View>
  );
}

function ProofPanelPane({
  steps,
  partIndex,
  partCount,
  lang,
  editorFontSize,
}: {
  steps: BeatPosterProofStep[];
  partIndex: number;
  partCount: number;
  lang: 'en' | 'zh';
  editorFontSize: number;
}) {
  const lastIndex = steps.length - 1;
  const closingProof = partIndex === partCount - 1;
  const fontSize = editorFontSize * BEAT_POSTER_PREVIEW_FONT_SCALE;
  const moves = steps.map((step, index) => (
    <ProofMoveBlock
      key={`proof-${index}`}
      step={step}
      isLastMove={closingProof && index === lastIndex}
      lang={lang}
    />
  ));
  if (Platform.OS === 'web') {
    return createElement(
      'div',
      { className: webClassName(classes.editorWrap, classes.proofStage) },
      createElement(
        'div',
        {
          className: webClassName(classes.proofBody),
          style: { fontSize: `${fontSize}px` },
        },
        moves,
      ),
    );
  }
  return (
    <View style={webModuleStyle(classes.editorWrap, classes.proofStage)}>
      <View style={[webModuleStyle(classes.proofBody), { fontSize }]}>
        {moves}
      </View>
    </View>
  );
}

export function BeatPosterSlide({
  lang,
  beatTitle,
  paragraphs,
  leanCode,
  turnCode,
  proofSteps = [],
  proofPartIndex = 0,
  proofPartCount = 1,
  nextLead,
  pageLabel,
  decorations,
  layout,
  compact = false,
}: BeatPosterSlideProps) {
  const showProofPanel = proofSteps.length > 0;
  return (
    <View
      style={webModuleStyle(classes.frame, compact ? classes.frameCompact : null)}
      accessibilityLabel={beatTitle}
    >
      <View style={webModuleStyle(
        classes.poster,
        lang === 'zh' ? classes.posterZh : null,
        layout.primaryEditor === 'turn' ? classes.posterTurn : classes.posterLean,
        showProofPanel ? classes.posterProof : null,
      )}>
        {showProofPanel ? null : (
          <Text style={webModuleStyle(classes.sparkle, classes.sparkleOne)}>
            {layout.primaryEditor === 'turn' && decorations.sparkle ? '✨' : '✧'}
          </Text>
        )}
        {!showProofPanel && layout.primaryEditor === 'turn' && decorations.sparkle ? (
          <Text style={webModuleStyle(classes.sparkle, classes.sparkleTwo)}>🔥</Text>
        ) : null}
        <View style={webModuleStyle(classes.header)}>
          <View
            style={[
              webModuleStyle(classes.titlePaper),
              showProofPanel ? null : { transform: [{ rotate: `${decorations.titleTilt}deg` }] },
            ]}
          >
            <Text
              style={[
                webModuleStyle(classes.title),
                { fontSize: layout.titleFontSize * 0.42 },
              ]}
            >
              {beatTitle}
            </Text>
            {showProofPanel
              ? (
                <Text style={webModuleStyle(classes.stepKindChip)}>
                  {proofStepKindLabel(layout.primaryEditor, lang)}
                </Text>
              )
              : null}
          </View>
        </View>

        <View style={webModuleStyle(classes.cards)}>
          {paragraphs.map((paragraph, index) => (
            <View
              key={`p-${index}`}
              style={[
                webModuleStyle(
                  classes.card,
                  classes.textCard,
                  paragraphs.length >= 2
                    ? classes.textCardDense
                    : layout.codeCardAutoHeight
                      ? classes.textCardSpacious
                      : null,
                ),
                { transform: [{ rotate: `${decorations.cardTilt * -0.8}deg` }] },
              ]}
            >
              <Text
                style={[
                  webModuleStyle(classes.textCardText),
                  { fontSize: layout.paragraphFontSize * 0.42 },
                ]}
              >
                <RichInlineText text={paragraph} />
              </Text>
            </View>
          ))}
          {showProofPanel ? (
            <View
              style={webModuleStyle(classes.card, classes.codeCard, classes.codeCardAuto)}
            >
              <View style={webModuleStyle(classes.editors, classes.editorsSingle)}>
                <ProofPanelPane
                  steps={proofSteps}
                  partIndex={proofPartIndex}
                  partCount={proofPartCount}
                  lang={lang}
                  editorFontSize={layout.editorFontSize}
                />
              </View>
            </View>
          ) : leanCode.trim() || turnCode.trim() ? (
            <View
              style={webModuleStyle(classes.card, classes.codeCard, classes.codeCardAuto)}
            >
              <View style={webModuleStyle(classes.editors, classes.editorsSingle)}>
                <CodeEditorPane
                  label={layout.primaryEditor === 'lean' ? 'Lean 4' : 'Turn-Lang'}
                  dialect={layout.primaryEditor}
                  code={layout.primaryEditor === 'lean' ? leanCode : turnCode}
                  lines={layout.primaryEditor === 'lean' ? layout.leanLines : layout.turnLines}
                  editorFontSize={layout.editorFontSize}
                  autoHeight
                />
              </View>
            </View>
          ) : null}
          {nextLead.trim() ? (
            <View
              style={[
                webModuleStyle(classes.nextLeadCard),
                { transform: [{ rotate: `${decorations.cardTilt * 0.25}deg` }] },
              ]}
            >
              <Text style={webModuleStyle(classes.nextLeadLabel)}>
                {lang === 'zh' ? '下一篇' : 'Up next'}
              </Text>
              <Text
                style={[
                  webModuleStyle(classes.nextLeadText),
                  { fontSize: layout.paragraphFontSize * 0.3 },
                ]}
              >
                <RichInlineText text={nextLead} richClassName={classes.nextLeadRich} />
              </Text>
            </View>
          ) : null}
        </View>

        <View style={webModuleStyle(classes.footer)}>
          <Text style={webModuleStyle(classes.pageLabel)}>{pageLabel}</Text>
          <Text style={webModuleStyle(classes.footerVs)}>Lean 4 vs Turn-Lang</Text>
        </View>
      </View>
    </View>
  );
}
