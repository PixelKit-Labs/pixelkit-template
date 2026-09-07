// Default Expo Metro config. PixelKit is resolved from node_modules like any other dependency.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
