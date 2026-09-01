# Cube Player — Android TV (Xiaomi Mi Box S) build vodič

## Zašto se pojavljuje "App not installed"

Ta greška gotovo nikad nije greška web koda. Najčešći uzroci na Xiaomi Android TV-u:

1. **Već je instalirana verzija s drugim potpisom** (npr. prije debug, sad release).
   → Deinstaliraj staru: `adb uninstall app.lovable.p764b882ce0894c4694bbe36408ee8d5f`
2. **APK nije potpisan** (`app-release-unsigned.apk`). Android TV ne instalira nepotpisane APK-ove.
   → Koristi `assembleDebug` za testiranje ili potpiši release APK.
3. **`minSdkVersion` viši od uređaja.** Mi Box S je Android 9 (API 28) → minSdk 22–24 je siguran.
4. **Nedostaje Leanback deklaracija** pa Play/launcher odbija instalaciju kao "nije za TV".
5. **Nema slobodnog prostora** ili je APK prenesen preko USB-a nepotpuno (kopiraj ponovno).

## Koraci za build

```bash
git pull
npm install
npx cap add android
npx cap sync android
```

Zatim primijeni TV prilagodbe iz mape `android-tv/` (kopiraj sadržaj preko generiranih datoteka):

- `android-tv/AndroidManifest.xml` → `android/app/src/main/AndroidManifest.xml`
- `android-tv/variables.gradle` → `android/variables.gradle`

Pa build:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Što TV prilagodbe rade

- `android.software.leanback` + `LEANBACK_LAUNCHER` intent → aplikacija se pojavljuje na Android TV home ekranu.
- `android.hardware.touchscreen` = `required="false"` → instalacija dopuštena na uređajima bez ekrana na dodir (bez ovoga instalacija pada).
- `screenOrientation="landscape"`, `resizeableActivity="false"` → nema rotacija/preskakanja veličine.
- `usesCleartextTraffic="true"` + `hardwareAccelerated="true"` → HTTP streamovi i GPU dekodiranje rade.
- `banner` (320x180) je obavezan za Leanback; dodaj `android/app/src/main/res/drawable/tv_banner.png`.
- `minSdkVersion 24`, `compileSdk/targetSdk 35` → kompatibilno s Mi Box S i Play zahtjevima.

## Live reload vs. samostalni APK

`capacitor.config.ts` sadrži `server.url` prema Lovable previewu — korisno za razvoj, ali APK tada
uvijek treba internet i pokazuje preview verziju. Za samostalni APK zakomentiraj `server` blok,
pokreni `npm run build && npx cap sync android` i ponovno napravi build.
