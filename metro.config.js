const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

if (!config.resolver.sourceExts.includes('cjs')) {
	config.resolver.sourceExts.push('cjs');
}

module.exports = withNativeWind(config, {
	input: path.resolve(__dirname, 'global.css'),
	configPath: path.resolve(__dirname, 'tailwind.config.js'),
});
