#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.join(import.meta.dirname, '..', 'src');

const replacements = [
  // screens + app external imports
  ["from '../components/layout/Header'", "from '../components/Header'"],
  ["from '../components/layout/InboxBanner'", "from '../components/InboxBanner'"],
  ["from '../components/layout/ScreenShell'", "from '../components/ScreenShell'"],
  ["from './components/layout/ScreenShell'", "from './components/ScreenShell'"],
  ["from '../components/ui/Button'", "from '../components/Button'"],
  ["from '../components/ui/Badge'", "from '../components/Badge'"],
  ["from '../components/ui/SectionLabel'", "from '../components/SectionLabel'"],
  ["from '../components/animation/BeatOverviewStrip'", "from '../components/BeatOverviewStrip'"],
  ["from '../components/animation/ScriptRemotionPreview'", "from '../components/ScriptRemotionPreview'"],

  // sibling component imports (old flat + ui/layout paths)
  ["from './ui/Button'", "from '../Button'"],
  ["from './ui/Badge'", "from '../Badge'"],
  ["from './ui/SectionLabel'", "from '../SectionLabel'"],
  ["from './ui/CollapsibleSection'", "from '../CollapsibleSection'"],
  ["from './ui/AutoGrowTextInput'", "from '../AutoGrowTextInput'"],
  ["from '../ui/Button'", "from '../Button'"],
  ["from '../ui/Badge'", "from '../Badge'"],
  ["from '../ui/SectionLabel'", "from '../SectionLabel'"],
  ["from '../ui/CollapsibleSection'", "from '../CollapsibleSection'"],
  ["from '../ui/AutoGrowTextInput'", "from '../AutoGrowTextInput'"],
  ["from './layout/Header'", "from '../Header'"],
  ["from './layout/InboxBanner'", "from '../InboxBanner'"],
  ["from './layout/ScreenShell'", "from '../ScreenShell'"],
  ["from './AbortStageButton'", "from '../AbortStageButton'"],
  ["from './AlignReviewPanel'", "from '../AlignReviewPanel'"],
  ["from './CompositeBlock'", "from '../CompositeBlock'"],
  ["from './CutReviewPanel'", "from '../CutReviewPanel'"],
  ["from './PipelineVideo'", "from '../PipelineVideo'"],
  ["from './RemotionEmbed'", "from '../RemotionEmbed'"],
  ["from './RemotionEmbed.types'", "from '../RemotionEmbed/RemotionEmbed.types'"],
  ["from './PipelineVideo.types'", "from '../PipelineVideo/PipelineVideo.types'"],
  ["from './SocialSetupPanel'", "from '../SocialSetupPanel'"],
  ["from './StabilizePanel'", "from '../StabilizePanel'"],
  ["from './StaleBanner'", "from '../StaleBanner'"],
  ["from './StageErrorBlock'", "from '../StageErrorBlock'"],
  ["from './CoverLibraryPanel'", "from '../CoverLibraryPanel'"],
  ["from './TakeResults'", "from '../TakeResults'"],
  ["from './TakeStepstones'", "from '../TakeStepstones'"],
  ["from './animation/BeatOverviewStrip'", "from '../BeatOverviewStrip'"],
  ["from './animation/ScriptRemotionPreview'", "from '../ScriptRemotionPreview'"],
  ["from './BeatThumbnailCard'", "from '../BeatThumbnailCard'"],
  ["from './kitThemes'", "from '../kitThemes'"],
];

const deepenedRoots = new Set([
  'TakeResults',
  'ScriptBeatEditorPanel',
  'CutReviewPanel',
  'AlignReviewPanel',
  'CompositeBlock',
  'AlignFilmedClipControls',
  'AbortStageButton',
  'StaleBanner',
  'PipelineStagesPanel',
  'StabilizePanel',
  'CoverLibraryPanel',
  'SocialSetupPanel',
  'StageErrorBlock',
  'LocalTakeCard',
  'TakeStepstones',
  'TakeCard',
  'RemotionEmbed',
  'PipelineVideo',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function deepenImports(filePath, text) {
  const rel = path.relative(path.join(srcRoot, 'components'), filePath);
  const top = rel.split(path.sep)[0];
  if (!deepenedRoots.has(top)) return text;

  return text
    .replaceAll("from '../context/", "from '../../context/")
    .replaceAll("from '../theme'", "from '../../theme'")
    .replaceAll("from '../types'", "from '../../types'")
    .replaceAll("from '../api/", "from '../../api/")
    .replaceAll("from '../hooks/", "from '../../hooks/")
    .replaceAll("from '../layout'", "from '../../layout'")
    .replaceAll("from '../utils/", "from '../../utils/");
}

function patchFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (text.includes(from)) {
      text = text.replaceAll(from, to);
      changed = true;
    }
  }
  const deepened = deepenImports(filePath, text);
  if (deepened !== text) {
    text = deepened;
    changed = true;
  }
  if (changed) fs.writeFileSync(filePath, text);
}

for (const file of walk(srcRoot)) patchFile(file);

// components/index.ts
const indexPath = path.join(srcRoot, 'components', 'index.ts');
const index = fs.readFileSync(indexPath, 'utf8')
  .replaceAll("from './layout/Header'", "from './Header'")
  .replaceAll("from './layout/InboxBanner'", "from './InboxBanner'")
  .replaceAll("from './ui/Button'", "from './Button'")
  .replaceAll("from './ui/Badge'", "from './Badge'")
  .replaceAll("from './ui/SectionLabel'", "from './SectionLabel'")
  .replaceAll("from './CutReviewPanel'", "from './CutReviewPanel'")
  .replaceAll("from './AlignReviewPanel'", "from './AlignReviewPanel'")
  .replaceAll("from './CompositeBlock'", "from './CompositeBlock'")
  .replaceAll("from './SocialSetupPanel'", "from './SocialSetupPanel'")
  .replaceAll("from './StaleBanner'", "from './StaleBanner'")
  .replaceAll("from './StabilizePanel'", "from './StabilizePanel'")
  .replaceAll("from './CoverLibraryPanel'", "from './CoverLibraryPanel'")
  .replaceAll("from './PipelineStagesPanel'", "from './PipelineStagesPanel'")
  .replaceAll("from './StageErrorBlock'", "from './StageErrorBlock'")
  .replaceAll("from './TakeResults'", "from './TakeResults'")
  .replaceAll("from './TakeCard'", "from './TakeCard'")
  .replaceAll("from './LocalTakeCard'", "from './LocalTakeCard'")
  .replaceAll("from './TakeStepstones'", "from './TakeStepstones'")
  .replaceAll("from './PipelineVideo'", "from './PipelineVideo'")
  .replaceAll("from './RemotionEmbed'", "from './RemotionEmbed'");
fs.writeFileSync(indexPath, index);

console.log('imports patched');
