// Adds KC Ads on top of app.json: AdMob app ids from the build env, consent, iOS attribution
// and cross-promotion settings. See src/kit/ads/plugin.js and app-portfolio kit/ADS.md.
const withKcAds = require('./src/kit/ads/plugin');

module.exports = ({ config }) => withKcAds(config, { tracking: true });
