import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureVideoOpsDevApiServer } from './videoOpsDevApiServer';

import { VIDEO_OPS_DIR } from './videoOpsRoot';

const videoOpsRoot = VIDEO_OPS_DIR;

await ensureVideoOpsDevApiServer(videoOpsRoot);
