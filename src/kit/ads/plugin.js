// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Expo config plugin for KC Ads. Each app's app.config.js:
//   module.exports = ({ config }) => require('./src/kit/ads/plugin')(config, { tracking: true });
//
// - AdMob app ids come from the build env (ADMOB_ANDROID_APP_ID, ADMOB_IOS_APP_ID). Without them,
//   Google's sample app ids are used (test ads only), and production EAS builds refuse to start.
// - Google's SKAdNetwork ids for iOS install attribution (better iOS eCPMs).
// - The ATT purpose string, only for apps allowed to ask (never family apps).
// - URL-scheme queries so cross-promotion can skip KC apps already installed.
// - Family apps: the Android advertising-id permission is removed.
// - Android release builds: R8 keep rules for the UMP consent SDK and WorkManager's database.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const GOOGLE_SAMPLE_APP_IDS = { android: 'ca-app-pub-3940256099942544~3347511713', ios: 'ca-app-pub-3940256099942544~1458002511' };
const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;

// developers.google.com/admob/ios/3p-skadnetworks ("Last updated: January 30, 2026"): Google plus 49
// third-party buyers. Re-check when adding mediation networks; each network's own list goes here too.
const SKADNETWORK_IDS = [
  'cstr6suwn9', '4fzdc2evr5', '2fnua5tdw4', 'ydx93a7ass', 'p78axxw29g', 'v72qych5uu', 'ludvb6z3bs', 'cp8zw746q7', '3sh42y64q3', 'c6k4g5qg8m',
  's39g8k73mm', 'wg4vff78zm', '3qy4746246', 'f38h382jlk', 'hs6bdukanm', 'mlmmfzh3r3', 'v4nxqhlyqp', 'wzmmz9fp6w', 'su67r6k2v3', 'yclnxrl5pm',
  't38b2kh725', '7ug5zh24hu', 'gta9lk7p23', 'vutu7akeur', 'y5ghdn5j9k', 'v9wttpbfk9', 'n38lu8286q', '47vhws6wlr', 'kbd757ywx3', '9t245vhmpl',
  'a2p9lx4jpn', '22mmun2rn5', '44jx6755aq', 'k674qkevps', '4468km3ulz', '2u9pt9hc89', '8s468mfl3y', 'klf5c3l5u5', 'ppxm28t8ap', 'kbmxgpxpgc',
  'uw77j35x4d', '578prtvx9j', '4dzt52r2t5', 'tl55sbb4fm', 'c3frkrj4fj', 'e5fvkxwrpn', '8c4e2ghe7u', '3rd42ekr43', '97r2b46745', '3qcr597p9d',
].map((id) => `${id}.skadnetwork`);

/** Every KC app's URL scheme (its slug). iOS allows 50 query schemes. */
const KC_SCHEMES = [
  'stackup', 'worthit', 'afterhours', 'thirsty', 'loopday', 'kidquest', 'flipped', 'shiftledger', 'reset',
  'grannysvault', 'braindump', 'plateweek', 'daymark', 'keepit', 'studysprint', 'pawplan', 'tripsplit',
];

const AD_ID = 'com.google.android.gms.permission.AD_ID';
// R8 rules for Android release builds (minified, R8 full mode).
const R8_RULES = [
  ['Google UMP consent SDK', '-keep class com.google.android.gms.internal.consent_sdk.** { *; }'],
  // Google Mobile Ads pulls in WorkManager 2.7, whose Room database is built by reflection. Its own
  // rule keeps the class but not the constructor under full mode, so release builds crashed at
  // launch ("Failed to create an instance of androidx.work.impl.WorkDatabase").
  ['WorkManager Room database (from Google Mobile Ads)', '-keep class * extends androidx.room.RoomDatabase { <init>(); }'],
];

const TRACKING_TEXT =
  'Allowing this lets us show ads that are more relevant to you, which keeps the free version free. You can say no and still use everything.';

function appIds() {
  const env = { android: (process.env.ADMOB_ANDROID_APP_ID || '').trim(), ios: (process.env.ADMOB_IOS_APP_ID || '').trim() };
  const production = process.env.EAS_BUILD_PROFILE === 'production';
  const platform = process.env.EAS_BUILD_PLATFORM; // 'ios' | 'android' on EAS
  for (const p of ['android', 'ios']) {
    if (env[p] && !APP_ID.test(env[p])) throw new Error(`[kc-ads] ADMOB_${p.toUpperCase()}_APP_ID doesn't look like an AdMob app id (ca-app-pub-…~…).`);
    if (production && (!platform || platform === p) && !env[p]) {
      throw new Error(`[kc-ads] Production ${p} build without ADMOB_${p.toUpperCase()}_APP_ID. Add it to this app's EAS environment (kit/ADS.md).`);
    }
  }
  if (production && process.env.EXPO_PUBLIC_TEST_MODE === '1') console.warn('[kc-ads] EXPO_PUBLIC_TEST_MODE=1 in a production build: only Google test ads will load.');
  return { android: env.android || GOOGLE_SAMPLE_APP_IDS.android, ios: env.ios || GOOGLE_SAMPLE_APP_IDS.ios };
}

function withKcAds(config, { tracking = true, family = false } = {}) {
  const ids = appIds();
  const own = config.scheme;
  const schemes = KC_SCHEMES.filter((s) => s !== own);

  const plugins = (config.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'react-native-google-mobile-ads');
  plugins.push([
    'react-native-google-mobile-ads',
    {
      androidAppId: ids.android,
      iosAppId: ids.ios,
      // Analytics measurement waits for consent and initialisation (UK/EEA consent rules).
      delayAppMeasurementInit: true,
      skAdNetworkItems: SKADNETWORK_IDS,
      ...(tracking && !family ? { userTrackingUsageDescription: TRACKING_TEXT } : {}),
    },
  ]);
  config.plugins = plugins;

  const plist = { ...(config.ios && config.ios.infoPlist) };
  plist.LSApplicationQueriesSchemes = [...new Set([...(plist.LSApplicationQueriesSchemes || []), ...schemes])].slice(0, 50);
  config.ios = { ...config.ios, infoPlist: plist };

  if (family) {
    config.android = { ...config.android, blockedPermissions: [...new Set([...((config.android && config.android.blockedPermissions) || []), AD_ID])] };
  }

  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest.queries = manifest.queries && manifest.queries.length ? manifest.queries : [{}];
    const q = manifest.queries[0];
    q.intent = q.intent || [];
    const have = new Set(q.intent.flatMap((i) => (i.data || []).map((d) => d.$ && d.$['android:scheme'])).filter(Boolean));
    for (const s of schemes) {
      if (have.has(s)) continue;
      q.intent.push({ action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }], data: [{ $: { 'android:scheme': s } }] });
    }
    return c;
  });

  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      for (const [why, rule] of R8_RULES) {
        if (text.includes(rule)) continue;
        text = `${text}${text.endsWith('\n') || !text ? '' : '\n'}\n# KC Ads: ${why}\n${rule}\n`;
      }
      fs.writeFileSync(file, text);
      return c;
    },
  ]);

  return config;
}

module.exports = withKcAds;
module.exports.SKADNETWORK_IDS = SKADNETWORK_IDS;
module.exports.GOOGLE_SAMPLE_APP_IDS = GOOGLE_SAMPLE_APP_IDS;
