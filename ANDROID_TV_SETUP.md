# Cube Player — Android TV (Xiaomi Mi Box S)

Android projekt je već u repozitoriju (`android/`) i **potpuno konfiguriran za Android TV**.
Nema više ručnih izmjena koda — samo otvori i buildaj.

## Što je već postavljeno

- `android/app/src/main/AndroidManifest.xml`
  - `LEANBACK_LAUNCHER` intent-filter (aplikacija se vidi na Android TV home ekranu)
  - `android.software.leanback` i `android.hardware.touchscreen` = `required="false"`
  - `android:banner="@drawable/tv_banner"` (320x180 banner uključen)
  - `screenOrientation="landscape"`, `resizeableActivity="false"`
  - `usesCleartextTraffic="true"`, `hardwareAccelerated="true"`, `largeHeap="true"`
  - dozvole: INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK
- `android/variables.gradle`: `minSdkVersion 24`, `compileSdk 35`, `targetSdk 35`
- `capacitor.config.ts`: bez `server.url` → samostalni (offline-capable) APK
- Web build je već kopiran u `android/app/src/main/assets/public`
- `android/app/build.gradle`: opcionalni release signing preko `keystore.properties`

## Build u Android Studiju

1. Preuzmi/exportaj projekt.
2. Android Studio → **Open** → odaberi mapu `android`.
3. Pusti Gradle sync da završi.
4. **Build → Generate Signed App Bundle / APK → APK** → kreiraj ili odaberi keystore → `release` → Finish.

APK: `android/app/build/outputs/apk/release/app-release.apk`

### Alternativa: potpis iz komandne linije

```bash
cp android/keystore.properties.example android/keystore.properties  # popuni podatke
cd android && ./gradlew assembleRelease
```

## Instalacija na Mi Box S

```bash
adb uninstall app.lovable.p764b882ce0894c4694bbe36408ee8d5f   # ako je stara verzija s drugim potpisom
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

"App not installed" najčešće znači: stara instalacija s drugim potpisom, **nepotpisan** release APK,
premali `minSdk`/nedostatak Leanback deklaracije, ili nepotpuno kopiran APK preko USB-a.

## Kada promijeniš web kod

```bash
npm install
npm run build
npx cap sync android
```

## Live reload (samo za razvoj)

Odkomentiraj `server` blok u `capacitor.config.ts` i pokreni `npx cap sync android`.
