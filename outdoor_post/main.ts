import { runAiEdit } from './src/ai-edit.ts';
import { runAlignSpeechToBeats } from './src/align-speech-to-beats.ts';
import { runBuildOutdoorManifest } from './src/build-outdoor-manifest.ts';
import { runExportOutdoorScript } from './src/export-outdoor-script.ts';

function usage(): void {
  console.log(`Outdoor post — Deno CLI

Commands:
  export-outdoor-script <script-id> [out.json]
  ai-edit --video <path> --script <path> --take <path> --out-dir <dir> [--transcript <path>] [--no-render]
  align-speech-to-beats <script-id> [--edit-dir <dir>] [--retranscribe]
  build-outdoor-manifest <script-id> [--edit-dir <dir>]

Examples:
  deno task export-script sets-v2-04-set-equality
  deno run --allow-all main.ts ai-edit -- --video take.mp4 --script script.json --take take.json --out-dir export/
`);
}

export async function main(): Promise<void> {
  const [command, ...rest] = Deno.args;
  if (!command) {
    usage();
    Deno.exit(0);
  }

  switch (command) {
    case 'export-outdoor-script':
      await runExportOutdoorScript(rest);
      break;
    case 'ai-edit':
      await runAiEdit(rest);
      break;
    case 'align-speech-to-beats':
      await runAlignSpeechToBeats(rest);
      break;
    case 'build-outdoor-manifest':
      await runBuildOutdoorManifest(rest);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      usage();
      Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    Deno.exit(1);
  });
}
