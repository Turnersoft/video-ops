const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const outdoorUiRoot = path.resolve(projectRoot, '../outdoor-ui');
const outdoorUiNodeModules = path.resolve(outdoorUiRoot, 'node_modules');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const config = getDefaultConfig(projectRoot);

// Shared UI lives outside the Expo app; watch its sources only.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), outdoorUiRoot])];

// Never load Vite's react/RN copies from outdoor-ui/node_modules.
config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  new RegExp(`^${escapeRegExp(outdoorUiNodeModules)}[/\\\\].*`),
];

// Resolve all bare imports from the Expo app node_modules (peers are hoisted there,
// including @react-native/virtualized-lists).
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [appNodeModules];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@turn/outdoor-ui': outdoorUiRoot,
};

module.exports = config;
