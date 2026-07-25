// Remotion evaluates this file as CJS — do not use import.meta in imports here.
import fs from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";
import webpack from "webpack";

import {
  createVideoOpsStudioWriteMiddleware,
  remotionDirFromVideoOpsRoot,
} from "./scripts/videoOpsStudioWriteApi.ts";

const remotionDir = process.cwd();

function resolveVideoOpsRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (
      fs.existsSync(path.join(dir, "manifest.json")) &&
      (fs.existsSync(path.join(dir, "projects")) ||
        fs.existsSync(path.join(dir, "scripts")))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return path.resolve(startDir, "../..");
}

const VIDEO_OPS_ROOT = resolveVideoOpsRoot(remotionDir);
const TURN_USER_ROOT = path.resolve(
  VIDEO_OPS_ROOT,
  "../codetree/turn/turn-user",
);
/** Absolute path — Remotion resolves relative publicDir against remotionRoot, which varies by cwd. */
const publicDir = path.join(VIDEO_OPS_ROOT, "projects");
const visualizationRoot = path.join(
  TURN_USER_ROOT,
  "language_server/vscode_extension/src/visualization",
);

Config.setPublicDir(publicDir);
// manim-web / Three.js need ANGLE for headless Chromium WebGL (default SwiftShader fails).
Config.setChromiumOpenGlRenderer("angle");

const remotionSrc = path.join(remotionDir, "src");
const scssRule = {
  test: /\.scss$/,
  use: [
    "style-loader",
    {
      loader: "css-loader",
      options: {
        modules: {
          auto: (resourcePath) => resourcePath.endsWith(".module.scss"),
          localIdentName: "[name]__[local]",
          namedExport: false,
        },
        url: true,
      },
    },
    {
      loader: "sass-loader",
      options: {
        sassOptions: {
          loadPaths: [remotionSrc],
        },
      },
    },
  ],
};

Config.overrideWebpackConfig((config) => {
  const previousSetup = config.devServer?.setupMiddlewares;
  const studioWriteApi = createVideoOpsStudioWriteMiddleware(
    VIDEO_OPS_ROOT,
    remotionDirFromVideoOpsRoot(VIDEO_OPS_ROOT),
  );

  return {
  ...config,
  devServer: {
    ...config.devServer,
    setupMiddlewares: (middlewares, devServer) => {
      const next = previousSetup ? previousSetup(middlewares, devServer) : middlewares;
      next.unshift({
        name: "video-ops-studio-write-api",
        middleware: studioWriteApi,
      });
      return next;
    },
  },
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@turn-user": TURN_USER_ROOT,
    },
  },
  module: {
    ...config.module,
    rules: [
      ...(config.module?.rules ?? []),
      {
        test: /\.woff2?$/,
        include: [visualizationRoot],
        type: "asset/resource",
      },
      {
        ...scssRule,
        include: [visualizationRoot],
      },
      {
        ...scssRule,
        include: [remotionSrc],
      },
    ],
  },
  plugins: [
    ...(config.plugins ?? []),
    new webpack.DefinePlugin({
      __TURN_KNOWLEDGE_DEV_UI__: JSON.stringify(false),
    }),
  ],
};
});
