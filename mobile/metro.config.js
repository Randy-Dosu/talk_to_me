const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedSrc = path.resolve(projectRoot, '../src');
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Watch the shared TypeScript engine/data/lib modules in ../src
config.watchFolders = [sharedSrc];
config.resolver.nodeModulesPaths = [mobileNodeModules];

const SINGLETON_PACKAGES = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-native',
  'react-native-web',
]);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@shared/')) {
    const rewritten = path.join(sharedSrc, moduleName.slice('@shared/'.length));
    return context.resolveRequest(context, rewritten, platform);
  }

  if (SINGLETON_PACKAGES.has(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.ts') },
      moduleName,
      platform,
    );
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
