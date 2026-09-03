# iOS / TestFlight Dağıtım Rehberi

TaskFlow mobil uygulamasını iPhone'a dağıtmanın yolu TestFlight'tır. APK (Android)
iOS'ta çalışmaz; iOS ayrı bir build (`.ipa`) ve Apple'ın dağıtım kanalı ister.

Bu repo tarafındaki hazırlık zaten yapıldı:

- `app.json` → `ios.bundleIdentifier: com.taskflow.mobile`, `ios.config.usesNonExemptEncryption: false`
- `app.json` → `extra.googleIosClientId` mevcut (OAuth hazır)
- `eas.json` → `production` profili App Store (store) dağıtımı yapar, `autoIncrement: true` build numarasını her yüklemede artırır
- Frontend `/indir` sayfası `VITE_MOBILE_IOS_URL` set edilince iPhone butonunu gösterir
- Backend push (`exp.host`) platform-bağımsız — iOS APNs anahtarı build sırasında kurulunca çalışır

Aşağıdaki adımlar **Apple hesabıyla** yapılır ve tek seferliktir (build/submit dışında).

---

## 0. Ön koşul: Apple Developer Program

- <https://developer.apple.com/programs/enroll/> üzerinden kayıt ol — **99 USD/yıl**.
- Bireysel (Individual) yeterli. Onay genelde birkaç saat, bazen 24-48 saat sürer.
- Kullanılan Apple ID'de **iki adımlı doğrulama (2FA)** açık olmalı.

Üyelik onaylanmadan aşağıdaki hiçbir adım çalışmaz.

---

## 1. EAS CLI ve giriş

`apps/mobile/` dizininde:

```bash
npm i -g eas-cli          # veya: npx eas-cli@latest
eas login                 # Expo hesabı: alikcn35
eas whoami
```

---

## 2. İlk iOS build (kimlik bilgileri otomatik oluşur)

```bash
cd apps/mobile
eas build --platform ios --profile production
```

CLI interaktif olarak şunları sorar, hepsine izin ver:

1. **Apple hesabına giriş** — Apple ID + şifre + 2FA kodu.
2. **Bundle Identifier oluşturma** — `com.taskflow.mobile` Apple Developer portalında
   otomatik kaydedilir.
3. **Distribution Certificate + Provisioning Profile** — EAS üretir ve saklar.
4. **Push Notifications (APNs) key** — `expo-notifications` kullanıldığı için sorar.
   **"Yes" de**; EAS bir APNs key üretip hem Apple'a hem Expo push servisine bağlar.
   (iOS push bildirimleri bunsuz çalışmaz.)

Build ~10-20 dk sürer. Sonuç: EAS panosunda bir `.ipa` artefaktı.

> Kimlik bilgileri sonradan `eas credentials --platform ios` ile görüntülen/yönetilir.

---

## 3. App Store Connect'te uygulama kaydı

<https://appstoreconnect.apple.com> → **Apps** → **+** → **New App**:

| Alan | Değer |
| --- | --- |
| Platform | iOS |
| Name | `TaskFlow` (App Store'da benzersiz olmalı; alınmışsa `TaskFlow App` gibi bir varyant) |
| Primary Language | Turkish |
| Bundle ID | `com.taskflow.mobile` (2. adımda oluşan kayıt listede çıkar) |
| SKU | serbest, örn. `taskflow-mobile` |
| User Access | Full Access |

Kayıttan sonra **App Information → General Information → Apple ID** altındaki sayısal
değer `ascAppId`'dir. (TestFlight için bu değeri bir yere kaydetmen yeterli;
`eas submit` interaktif çalıştığı için `eas.json`'a yazmak zorunda değilsin.)

---

## 4. Build'i TestFlight'a gönder

```bash
cd apps/mobile
eas submit --platform ios --profile production
```

- Hangi build → en son `production` build'i seç.
- Apple ID / uygulama seçimi sorulur (ilk seferde). `ascAppId`'yi burada girersin.
- Yükleme + Apple'ın işlemesi ~10-15 dk. Sonra App Store Connect → **TestFlight**
  sekmesinde build **"Processing"** → hazır olur.

Export compliance sorusu `usesNonExemptEncryption: false` sayesinde otomatik geçilir.

---

## 5. TestFlight test grupları

App Store Connect → **TestFlight**:

### İç test (hızlı, incelemesiz)
- **Internal Testing** → grup oluştur → App Store Connect kullanıcısı olan kişileri
  ekle (max 100). Build'i gruba ekle. Anında kullanılabilir.
- Kısıt: her tester'ın Apple ID'si App Store Connect'e "user" olarak eklenmeli.

### Dış test (herkese açık link)
- **External Testing** → grup oluştur → build'i gruba ekle.
- İlk dış build için **Beta App Review** gerekir (genelde ~1 gün).
- **Test Information** doldur: beta açıklaması, geri bildirim e-postası, iletişim.
- Onaydan sonra grupta **"Public Link"i etkinleştir** → `https://testflight.apple.com/join/XXXXXXXX`
- Bu link herkese açık, App Store Connect kullanıcısı olmayan 10.000 kişiye kadar.

**Bu public link'i bana ilet** → `/indir` sayfasına ve env'e bağlarız.

---

## 6. Frontend'i bağla

Public TestFlight link'i alınınca:

- **Vercel** → Project Settings → Environment Variables:
  - `VITE_MOBILE_IOS_URL = https://testflight.apple.com/join/XXXXXXXX`
- Redeploy et.

`/indir` sayfası artık iPhone butonunu ve iOS adımlarını gösterir; link boşken
"iOS hazırlanıyor" notu görünür.

---

## 7. Sonraki sürümler

```bash
cd apps/mobile
# app.json'daki "version"u güncelle (örn. 1.0.1) — kullanıcıya görünen sürüm
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

- Build numarası (`buildNumber`) `autoIncrement` + `appVersionSource: "remote"`
  sayesinde EAS tarafından otomatik artar.
- Aynı `version` içinde küçük düzeltmeler için sadece build numarası artar, sorun değil.
- TestFlight build'leri **90 gün** sonra dolar; aktif dış test varsa periyodik yeni
  build gerekir.
- Public link **sabit kalır** — yeni build'i external gruba eklemen yeterli
  (sonraki build'ler için ek Beta App Review genelde gerekmez, ancak Apple bazı
  değişikliklerde tekrar isteyebilir).

---

## Özet komut akışı

```bash
cd apps/mobile
eas login
eas build   --platform ios --profile production      # ilk seferde kimlik + APNs kurulumu
eas submit  --platform ios --profile production      # TestFlight'a yükle
# App Store Connect → TestFlight → External → Public Link
# Vercel env: VITE_MOBILE_IOS_URL = <public link> → redeploy
```
