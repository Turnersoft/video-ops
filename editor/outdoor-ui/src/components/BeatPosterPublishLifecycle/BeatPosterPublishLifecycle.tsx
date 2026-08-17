import classes from './BeatPosterPublishLifecycle.module.scss';
import { createElement } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { platformLabel } from '../../utils/format';
import {
  AUTO_LIFECYCLE_STEPS,
  isPublishPhaseActive,
  lifecycleStepIndex,
  MANUAL_LIFECYCLE_STEPS,
  type PlatformPublishUi,
} from '../../utils/beatPosterPublishLifecycle';
import {
  formatPublishErrorLines,
  type PublishErrorDetails,
} from '../../utils/outdoorApiErrorDetails';
import { webClassName, webModuleStyle } from '../../utils/webClassName';

function PublishErrorPanel({ details }: { details: PublishErrorDetails }) {
  const lines = formatPublishErrorLines(details);
  const [summary, ...rest] = lines;
  const hintLine = rest.find((line) => line.startsWith('Fix: '));
  const otherLines = rest.filter((line) => !line.startsWith('Fix: '));
  return (
    <View style={webModuleStyle(classes.errorPanel)}>
      <Text style={webModuleStyle(classes.errorSummary)} selectable>
        {summary}
      </Text>
      {otherLines.map((line) => (
        <Text key={line} style={webModuleStyle(classes.errorLine)} selectable>
          {line}
        </Text>
      ))}
      {hintLine ? (
        <Text style={webModuleStyle(classes.errorHint)} selectable>
          {hintLine}
        </Text>
      ) : null}
    </View>
  );
}

function shellClass(phase: PlatformPublishUi['phase']): string | null {
  if (phase === 'failed') return classes.shellFailed;
  if (phase === 'live') return classes.shellLive;
  if (isPublishPhaseActive(phase)) return classes.shellActive;
  return null;
}

export function BeatPosterPublishLifecycle({
  platform,
  publishMode,
  ui,
  compact = false,
  onRevert,
  revertBusy = false,
  canRevert = false,
}: {
  platform: string;
  publishMode: 'auto' | 'manual';
  ui: PlatformPublishUi;
  compact?: boolean;
  onRevert?: () => void;
  revertBusy?: boolean;
  canRevert?: boolean;
}) {
  const steps = publishMode === 'manual' ? MANUAL_LIFECYCLE_STEPS : AUTO_LIFECYCLE_STEPS;
  const activeIndex = lifecycleStepIndex(steps, ui.phase);
  const failed = ui.phase === 'failed';

  return (
    <View style={webModuleStyle(classes.shell, shellClass(ui.phase))}>
      <View style={webModuleStyle(classes.headerRow)}>
        {isPublishPhaseActive(ui.phase) ? <ActivityIndicator size="small" /> : null}
        <Text style={webModuleStyle(classes.phaseLabel)}>
          {platformLabel(platform)} · {ui.message ?? ui.phase}
        </Text>
      </View>
      {!compact ? (
        <View style={webModuleStyle(classes.steps)}>
          {steps.map((step, index) => {
            const done = !failed && index < activeIndex;
            const active = !failed && index === activeIndex;
            const stepFailed = failed && index === activeIndex;
            return (
              <View
                key={`${platform}-${step.phase}`}
                style={webModuleStyle(
                  classes.step,
                  done ? classes.stepDone : null,
                  active && !failed ? classes.stepActive : null,
                  stepFailed ? classes.stepFailed : null,
                )}
              >
                <View
                  style={webModuleStyle(
                    classes.stepDot,
                    done ? classes.stepDotDone : null,
                    active ? classes.stepDotActive : null,
                    stepFailed ? classes.stepDotFailed : null,
                  )}
                />
                <Text
                  style={webModuleStyle(
                    classes.stepText,
                    done || active ? classes.stepTextActive : null,
                  )}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {failed ? (
        <View style={webModuleStyle(classes.failedChip)}>
          <Text style={webModuleStyle(classes.failedChipText)}>Failed</Text>
        </View>
      ) : null}
      {ui.errorDetails ? (
        <PublishErrorPanel details={ui.errorDetails} />
      ) : ui.error ? (
        <Text style={webModuleStyle(classes.errorText)} selectable>
          {ui.error}
        </Text>
      ) : null}
      {ui.postUrl && Platform.OS === 'web' ? (
        createElement(
          'a',
          {
            href: ui.postUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: webClassName(classes.postLink),
          },
          ui.phase === 'live' ? `View live post on ${platformLabel(platform)}` : `Open Postiz / platform link`,
        )
      ) : null}
      {ui.postUrl && Platform.OS !== 'web' ? (
        <Text style={webModuleStyle(classes.phaseDetail)} selectable>
          {ui.postUrl}
        </Text>
      ) : null}
      {ui.updatedAt && !compact ? (
        <Text style={webModuleStyle(classes.phaseDetail)}>Updated {ui.updatedAt}</Text>
      ) : null}
      {canRevert && onRevert && Platform.OS === 'web' ? (
        createElement(
          'button',
          {
            type: 'button',
            className: webClassName(classes.revertButtonText),
            disabled: revertBusy,
            onClick: onRevert,
          },
          revertBusy ? 'Reverting…' : 'Revert upload (delete from Postiz queue)',
        )
      ) : null}
      {canRevert && onRevert && Platform.OS !== 'web' ? (
        <Text style={webModuleStyle(classes.revertButtonText)} onPress={revertBusy ? undefined : onRevert}>
          {revertBusy ? 'Reverting…' : 'Revert upload'}
        </Text>
      ) : null}
    </View>
  );
}

export function BeatPosterPublishGlobalBar({
  title,
  detail,
  tone,
  postUrl,
  errorDetails,
}: {
  title: string;
  detail?: string;
  tone: 'active' | 'success' | 'error' | 'idle';
  postUrl?: string;
  errorDetails?: PublishErrorDetails;
}) {
  if (tone === 'idle' && !detail) {
    return null;
  }
  return (
    <View
      style={webModuleStyle(
        classes.globalBar,
        tone === 'active' ? classes.globalBarActive : null,
        tone === 'success' ? classes.globalBarSuccess : null,
        tone === 'error' ? classes.globalBarError : null,
      )}
    >
      <View style={webModuleStyle(classes.headerRow)}>
        {tone === 'active' ? <ActivityIndicator size="small" /> : null}
        <Text style={webModuleStyle(classes.globalTitle)}>{title}</Text>
      </View>
      {detail ? <Text style={webModuleStyle(classes.phaseDetail)}>{detail}</Text> : null}
      {errorDetails ? <PublishErrorPanel details={errorDetails} /> : null}
      {postUrl && Platform.OS === 'web' ? (
        createElement(
          'a',
          {
            href: postUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: webClassName(classes.postLink),
          },
          postUrl,
        )
      ) : null}
    </View>
  );
}
