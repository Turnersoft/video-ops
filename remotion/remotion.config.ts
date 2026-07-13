// Remotion evaluates this file as CJS — do not use import.meta in imports here.
import path from 'node:path';
import { Config } from '@remotion/cli/config';
import webpack from 'webpack';

const remotionDir = process.cwd();
const VIDEO_OPS_ROOT = path.resolve(remotionDir, '..');
const BASIC_UI_ROOT = path.resolve(VIDEO_OPS_ROOT, '../basic_ui');
const TURN_USER_ROOT = path.resolve(VIDEO_OPS_ROOT, '../codetree/turn/turn-user');
const publicDir = path.join(VIDEO_OPS_ROOT, 'public');
const turnVideoSharedRoot = path.join(BASIC_UI_ROOT, 'src/shared/turn-video');
const visualizationRoot = path.join(
    TURN_USER_ROOT,
    'language_server/vscode_extension/src/visualization',
);

Config.setPublicDir(publicDir);

Config.overrideWebpackConfig((config) => ({
    ...config,
    resolve: {
        ...config.resolve,
        alias: {
            ...(config.resolve?.alias ?? {}),
            '@turn-user': TURN_USER_ROOT,
            '@turn-video-shared': turnVideoSharedRoot,
        },
    },
    module: {
        ...config.module,
        rules: [
            ...(config.module?.rules ?? []),
            {
                test: /\.woff2?$/,
                include: [visualizationRoot],
                type: 'asset/resource',
            },
            {
                test: /\.scss$/,
                include: [visualizationRoot, turnVideoSharedRoot],
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                namedExport: false,
                            },
                            url: true,
                        },
                    },
                    'sass-loader',
                ],
            },
        ],
    },
    plugins: [
        ...(config.plugins ?? []),
        new webpack.DefinePlugin({
            __TURN_KNOWLEDGE_DEV_UI__: JSON.stringify(false),
        }),
    ],
}));
