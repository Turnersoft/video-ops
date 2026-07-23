#!/usr/bin/env node
/**
 * One-shot restructure: each component -> its own folder with index.ts barrel.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..', 'src', 'components');

const moves = [
  ['ui/Button.tsx', 'Button/Button.tsx'],
  ['ui/Badge.tsx', 'Badge/Badge.tsx'],
  ['ui/SectionLabel.tsx', 'SectionLabel/SectionLabel.tsx'],
  ['ui/CollapsibleSection.tsx', 'CollapsibleSection/CollapsibleSection.tsx'],
  ['ui/AutoGrowTextInput.tsx', 'AutoGrowTextInput/AutoGrowTextInput.tsx'],
  ['layout/Header.tsx', 'Header/Header.tsx'],
  ['layout/InboxBanner.tsx', 'InboxBanner/InboxBanner.tsx'],
  ['layout/ScreenShell.tsx', 'ScreenShell/ScreenShell.tsx'],
  ['animation/ScriptRemotionPreview.tsx', 'ScriptRemotionPreview/ScriptRemotionPreview.tsx'],
  ['animation/BeatOverviewStrip.tsx', 'BeatOverviewStrip/BeatOverviewStrip.tsx'],
  ['animation/BeatThumbnailCard.tsx', 'BeatThumbnailCard/BeatThumbnailCard.tsx'],
  ['animation/kitThemes.ts', 'kitThemes/kitThemes.ts'],
  ['TakeResults.tsx', 'TakeResults/TakeResults.tsx'],
  ['ScriptBeatEditorPanel.tsx', 'ScriptBeatEditorPanel/ScriptBeatEditorPanel.tsx'],
  ['RemotionEmbed.web.tsx', 'RemotionEmbed/RemotionEmbed.web.tsx'],
  ['RemotionEmbed.native.tsx', 'RemotionEmbed/RemotionEmbed.native.tsx'],
  ['RemotionEmbed.types.ts', 'RemotionEmbed/RemotionEmbed.types.ts'],
  ['CutReviewPanel.tsx', 'CutReviewPanel/CutReviewPanel.tsx'],
  ['AlignReviewPanel.tsx', 'AlignReviewPanel/AlignReviewPanel.tsx'],
  ['CompositeBlock.tsx', 'CompositeBlock/CompositeBlock.tsx'],
  ['AlignFilmedClipControls.tsx', 'AlignFilmedClipControls/AlignFilmedClipControls.tsx'],
  ['AbortStageButton.tsx', 'AbortStageButton/AbortStageButton.tsx'],
  ['StaleBanner.tsx', 'StaleBanner/StaleBanner.tsx'],
  ['PipelineStagesPanel.tsx', 'PipelineStagesPanel/PipelineStagesPanel.tsx'],
  ['StabilizePanel.tsx', 'StabilizePanel/StabilizePanel.tsx'],
  ['CoverLibraryPanel.tsx', 'CoverLibraryPanel/CoverLibraryPanel.tsx'],
  ['SocialSetupPanel.tsx', 'SocialSetupPanel/SocialSetupPanel.tsx'],
  ['StageErrorBlock.tsx', 'StageErrorBlock/StageErrorBlock.tsx'],
  ['LocalTakeCard.tsx', 'LocalTakeCard/LocalTakeCard.tsx'],
  ['TakeStepstones.tsx', 'TakeStepstones/TakeStepstones.tsx'],
  ['PipelineVideo.web.tsx', 'PipelineVideo/PipelineVideo.web.tsx'],
  ['PipelineVideo.native.tsx', 'PipelineVideo/PipelineVideo.native.tsx'],
  ['PipelineVideo.types.ts', 'PipelineVideo/PipelineVideo.types.ts'],
  ['TakeCard.tsx', 'TakeCard/TakeCard.tsx'],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveFile(fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (!fs.existsSync(from)) {
    console.warn(`skip missing: ${fromRel}`);
    return;
  }
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
  console.log(`${fromRel} -> ${toRel}`);
}

for (const [from, to] of moves) {
  moveFile(from, to);
}

// Remove empty legacy dirs
for (const legacy of ['ui', 'layout', 'animation']) {
  const legacyPath = path.join(root, legacy);
  if (fs.existsSync(legacyPath) && fs.readdirSync(legacyPath).length === 0) {
    fs.rmdirSync(legacyPath);
  }
}

// Create barrel index.ts for each component folder
const folders = new Set(moves.map(([, to]) => to.split('/')[0]));
for (const folder of folders) {
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir);
  const mainTsx = files.find((f) => f === `${folder}.tsx`);
  const webTsx = files.find((f) => f === `${folder}.web.tsx`);
  const typesFile = files.find((f) => f.endsWith('.types.ts'));
  const indexPath = path.join(dir, 'index.ts');

  if (fs.existsSync(indexPath)) continue;

  const lines = [];
  if (mainTsx) {
    lines.push(`export * from './${folder}';`);
  } else if (webTsx) {
    lines.push(`export * from './${folder}';`);
  } else if (folder === 'kitThemes') {
    lines.push(`export * from './kitThemes';`);
  }

  if (typesFile && !mainTsx && !webTsx) {
    lines.push(`export * from './${typesFile.replace(/\.ts$/, '')}';`);
  }

  if (lines.length > 0) {
    fs.writeFileSync(indexPath, `${lines.join('\n')}\n`);
    console.log(`wrote ${folder}/index.ts`);
  }
}

// PipelineVideo / RemotionEmbed need explicit barrels (platform split)
for (const folder of ['PipelineVideo', 'RemotionEmbed']) {
  const indexPath = path.join(root, folder, 'index.ts');
  fs.writeFileSync(
    indexPath,
    `export * from './${folder}';\nexport type * from './${folder}.types';\n`,
  );
}

console.log('done');
