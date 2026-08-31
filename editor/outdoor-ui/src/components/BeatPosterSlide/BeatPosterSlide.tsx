export type { BeatPosterSlideProps } from './BeatPosterSlide.types';

import classes from './BeatPosterSlide.module.scss';
import type { BeatPosterSlideProps } from './BeatPosterSlide.types';
import { createElement } from 'react';
import { Platform, Text, View } from 'react-native';

import { beatPosterBrandLogoUrl } from '../../utils/beatPosterBrandLogos';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import { highlightCodeLines } from '../../utils/beatPosterCodeHighlight';
import type { HighlightToken } from '../../utils/beatPosterCodeHighlight';
import {
  BEAT_POSTER_PREVIEW_FONT_SCALE,
  MIN_EDITOR_FONT_SIZE,
} from '../../../../../src/beatPosterLayout';

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

export function BeatPosterSlide({
  lang,
  beatTitle,
  paragraphs,
  leanCode,
  turnCode,
  nextLead,
  decorations,
  layout,
  compact = false,
}: BeatPosterSlideProps) {
  return (
    <View
      style={webModuleStyle(classes.frame, compact ? classes.frameCompact : null)}
      accessibilityLabel={beatTitle}
    >
      <View style={webModuleStyle(
        classes.poster,
        lang === 'zh' ? classes.posterZh : null,
        layout.primaryEditor === 'turn' ? classes.posterTurn : classes.posterLean,
      )}>
        <Text style={webModuleStyle(classes.sparkle, classes.sparkleOne)}>
          {layout.primaryEditor === 'turn' && decorations.sparkle ? '✨' : '✧'}
        </Text>
        {layout.primaryEditor === 'turn' && decorations.sparkle ? (
          <Text style={webModuleStyle(classes.sparkle, classes.sparkleTwo)}>🔥</Text>
        ) : null}
        <View style={webModuleStyle(classes.header)}>
          <View
            style={[
              webModuleStyle(classes.titlePaper),
              { transform: [{ rotate: `${decorations.titleTilt}deg` }] },
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
          {leanCode.trim() || turnCode.trim() ? (
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
          <Text style={webModuleStyle(classes.footerVs)}>Lean 4 vs Turn-Lang</Text>
        </View>
      </View>
    </View>
  );
}
