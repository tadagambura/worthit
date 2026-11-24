// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The two SDK-rendered views: an anchored adaptive banner and a native ad card.
// Only kit/ads/components.tsx uses these.
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import type * as GMA from 'react-native-google-mobile-ads';
import { useTheme } from '../theme';
import { gma, paidMicros } from './sdk.native';
import type { SdkEvent } from './sdk.types';

export const viewsSupported = true;

type Common = { unitId: string; npa: boolean; onEvent: (e: SdkEvent) => void };

const failed = (e: { reason?: string; code?: string } | undefined): SdkEvent => ({
  type: 'failed',
  noFill: e?.reason === 'no-fill' || e?.reason === 'mediation-no-fill',
  code: String(e?.reason ?? e?.code ?? 'unknown'),
  phase: 'load',
});

export function SdkBanner({ unitId, npa, onEvent, onHeight }: Common & { onHeight: (h: number) => void }) {
  const { BannerAd, BannerAdSize } = gma();
  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: npa }}
      onAdLoaded={(d) => {
        onHeight(d.height);
        onEvent({ type: 'loaded', network: d.responseInfo?.loadedAdapterResponse?.adSourceName ?? null });
      }}
      onAdFailedToLoad={(e) => onEvent(failed(e))}
      onAdImpression={() => onEvent({ type: 'impression' })}
      onAdClicked={() => onEvent({ type: 'clicked' })}
      onPaid={(p) => onEvent({ type: 'paid', micros: paidMicros(p), currency: p.currency, precision: Number(p.precision), network: p.responseInfo?.loadedAdapterResponse?.adSourceName ?? null })}
    />
  );
}

/**
 * A native ad styled like the app's cards but always labelled "Ad" and set apart with a
 * tinted background, so it can't be mistaken for the app's own content (AdMob native policy).
 */
export function SdkNative({ unitId, npa, onEvent }: Common) {
  const { c, radius } = useTheme();
  const [ad, setAd] = useState<GMA.NativeAd | null>(null);

  useEffect(() => {
    let alive = true;
    let held: GMA.NativeAd | null = null;
    const { NativeAd, NativeAdEventType, NativeMediaAspectRatio, NativeAdChoicesPlacement } = gma();
    NativeAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: npa,
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
      startVideoMuted: true,
    }).then(
      (n) => {
        if (!alive) return n.destroy();
        held = n;
        n.addAdEventListener(NativeAdEventType.IMPRESSION, () => onEvent({ type: 'impression' }));
        n.addAdEventListener(NativeAdEventType.CLICKED, () => onEvent({ type: 'clicked' }));
        n.addAdEventListener(NativeAdEventType.PAID, (p) =>
          onEvent({ type: 'paid', micros: paidMicros(p), currency: p.currency, precision: Number(p.precision), network: n.responseInfo?.loadedAdapterResponse?.adSourceName ?? null }),
        );
        onEvent({ type: 'loaded', network: n.responseInfo?.loadedAdapterResponse?.adSourceName ?? null });
        setAd(n);
      },
      (e) => alive && onEvent(failed(e)),
    );
    return () => {
      alive = false;
      held?.destroy();
    };
    // One request per mount; the parent remounts to retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, npa]);

  if (!ad) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = gma();
  return (
    <NativeAdView nativeAd={ad} style={{ backgroundColor: c.surfaceAlt, borderRadius: radius, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ backgroundColor: c.accent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: c.accentText, fontWeight: '800', fontSize: 11 }} accessibilityLabel="Advertisement">
            Ad
          </Text>
        </View>
        {ad.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: ad.icon.url }} style={{ width: 32, height: 32, borderRadius: 6 }} accessibilityIgnoresInvertColors />
          </NativeAsset>
        ) : null}
        <View style={{ flex: 1 }}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }} numberOfLines={2}>
              {ad.headline}
            </Text>
          </NativeAsset>
          {ad.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>
                {ad.advertiser}
              </Text>
            </NativeAsset>
          ) : null}
        </View>
      </View>
      <NativeMediaView style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: Math.max(4, radius - 6), overflow: 'hidden' }} resizeMode="cover" />
      {ad.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={{ color: c.text, fontSize: 14 }} numberOfLines={3}>
            {ad.body}
          </Text>
        </NativeAsset>
      ) : null}
      {ad.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={{ alignSelf: 'flex-start', backgroundColor: c.primary, color: c.primaryText, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius, overflow: 'hidden' }}>
            {ad.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}
