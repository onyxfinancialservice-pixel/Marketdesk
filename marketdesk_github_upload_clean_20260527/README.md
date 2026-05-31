# PBM Mobile PWA Update

Bu paket sadece mobil menuyu ve Add to Home Screen/PWA dosyalarini ekler.
Mevcut desktop tasarim, renk paleti, chart/AI ekranlari ve ana layout davranisi korunur.

## Github'a yuklenecek dosyalar

- `frontend/src/components/Layout.jsx`
- `frontend/src/components/MobileInstallPrompt.jsx`
- `frontend/src/index.js`
- `frontend/public/index.html`
- `frontend/public/manifest.json`
- `frontend/public/sw.js`
- `frontend/public/pbm-icon.svg`
- `frontend/public/pbm-icon-192.png`
- `frontend/public/pbm-icon-512.png`

## Deploy

1. Bu dosyalari repoda ayni path'lere upload et.
2. Commit mesaji: `Add mobile PWA menu`
3. Netlify'da yeni deploy baslat.
4. Mobilde siteyi ac, sag ustteki menu butonuna bas: menu alttan yukari animasyonlu acilir.
5. Android Chrome'da install prompt gelirse `Add` ile ana ekrana eklenir. iPhone Safari'de Share menu icinden `Add to Home Screen` secilir.

Supabase icin yeni SQL gerekmez.
