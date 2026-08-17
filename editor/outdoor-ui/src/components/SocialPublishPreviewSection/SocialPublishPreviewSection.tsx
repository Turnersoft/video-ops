export type { SocialPublishPreviewSectionProps } from './SocialPublishPreviewSection.types';

import classes from './SocialPublishPreviewSection.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { SocialPublishPreviewSectionProps } from './SocialPublishPreviewSection.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useScriptLanguage } from '../../hooks/useScriptLanguage';
import { colors } from '../../theme';
import type { PublishPlan, ScriptCoversResponse } from '../../types';
import { cardsFromSocialPosts, type SocialPreviewCard } from '../../utils/socialPreviewCards';
import {
  pickSocialCopyForPreview,
  socialCopySourceLabel,
} from '../../utils/socialCopyMerge';
import { ScriptCoversPanel } from '../ScriptCoversPanel/ScriptCoversPanel';
import { SocialCardsPanel } from '../SocialCardsPanel/SocialCardsPanel';
import { SocialPublishPreviewGrid } from '../SocialPublishPreviewGrid/SocialPublishPreviewGrid';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { LanguageToggle } from '../LanguageToggle/LanguageToggle';

export function SocialPublishPreviewSection({
  scriptId,
  jobId,
  publish = null,
}: SocialPublishPreviewSectionProps) {
  const { api, refreshKey } = useOutdoorUi();
  const { scriptLanguage, setScriptLanguage } = useScriptLanguage();
  const [loading, setLoading] = useState(true);
  const [scriptCovers, setScriptCovers] = useState<ScriptCoversResponse | null>(null);
  const [cards, setCards] = useState<SocialPreviewCard[]>([]);
  const [plan, setPlan] = useState<PublishPlan | null>(null);
  const [copySource, setCopySource] = useState<'take' | 'script' | 'merged' | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setCopyError(null);
    try {
      const [coverPack, takeSocial, scriptSocialResult, publishPlan] = await Promise.all([
        api.getScriptCovers(scriptId).catch(() => null),
        api.getSocial(jobId).catch(() => null),
        api.getScriptSocialPosts(scriptId).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : String(error),
        })),
        api.getPublishPreview(jobId).catch(() => null),
      ]);
      setScriptCovers(coverPack);
      setPlan(publishPlan);
      const scriptSocial =
        scriptSocialResult && 'error' in scriptSocialResult ? null : scriptSocialResult;
      if (scriptSocialResult && 'error' in scriptSocialResult && !takeSocial) {
        setCopyError(scriptSocialResult.error);
      }
      const social = pickSocialCopyForPreview(takeSocial, scriptSocial);
      setCopySource(socialCopySourceLabel(takeSocial, scriptSocial, social));
      setCards(social ? cardsFromSocialPosts(social) : []);
    } finally {
      setLoading(false);
    }
  }, [api, jobId, scriptId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const planReady = Boolean(plan?.ready && plan.platforms.length);
  const enCount =
    plan?.platforms.filter((entry) => entry.provider === 'postiz').length ?? 0;
  const filteredCards = useMemo(() => {
    if (scriptLanguage === 'zh') {
      return cards.filter(
        (card) => card.group === 'china' || (card.group === 'headline' && card.platform === 'ZH'),
      );
    }
    return cards.filter(
      (card) => card.group === 'english' || (card.group === 'headline' && card.platform === 'EN'),
    );
  }, [cards, scriptLanguage]);

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <View style={webModuleStyle(classes.headerRow)}>
        <SectionLabel>Social publish preview</SectionLabel>
        <LanguageToggle value={scriptLanguage} onChange={setScriptLanguage} />
      </View>
      <Text style={webModuleStyle(classes.meta)}>
        {planReady
          ? `Exact Postiz / SAU payload · ${plan!.platforms.length} platform(s)` +
            (enCount ? ` · ${enCount} via Postiz` : '') +
            ' · video below is what will upload'
          : copySource === 'take'
            ? 'Cover, title, and caption · using this take’s social pack'
            : copySource === 'script'
              ? 'Cover, title, and caption · from script social-posts.json until the social stage runs'
              : copySource === 'merged'
                ? 'Cover, title, and caption · China copy from script (take pack had English placeholders)'
                : 'Cover, title, and caption for every platform'}
      </Text>
      {plan && !plan.ready && plan.error ? (
        <Text style={webModuleStyle(classes.meta)}>
          Publish plan not ready: {plan.error}. Finish composite + social, then refresh.
        </Text>
      ) : null}

      <ScriptCoversPanel
        scriptId={scriptId}
        covers={scriptCovers}
        onCoversChange={(next) => {
          setScriptCovers(next);
        }}
        compact
      />

      {copyError ? (
        <Text style={webModuleStyle(classes.meta)}>
          Could not load social-posts.json — restart the Mac agent (`npm run outdoor:all`) if you
          just updated. {copyError}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.orange} />
      ) : (
        <SocialPublishPreviewGrid
          cards={filteredCards}
          scriptCovers={scriptCovers}
          planPlatforms={planReady ? plan!.platforms : null}
          publish={publish}
          showCaptions
          embedded
          emptyMessage={
            copyError
              ? null
              : 'No platform copy yet. Add projects/…/social-posts.json or run the Social stage on this take.'
          }
        />
      )}

      <SocialCardsPanel
        jobId={jobId}
        publish={publish}
        onPublishChange={() => {
          void load();
        }}
      />
    </View>
  );
}
