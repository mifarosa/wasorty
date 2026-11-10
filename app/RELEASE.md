# Wasorty'yi TestFlight'a (ve sonra App Store'a) yüklemek

Bu adımlar iPhone için. Derleme ve gönderme Expo'nun bulutunda (EAS) yapılır, Mac gerekmez.

## Bir kerelik hazırlık

1. **Apple Developer hesabı** (yıllık 99$) açık olsun: developer.apple.com.
2. **App Store Connect'te uygulama kaydı:** appstoreconnect.apple.com → My Apps → **+** → New App.
   Platform iOS, ad **Wasorty**, ana dil English, Bundle ID **com.mifarosa.wasorty**, SKU `wasorty`.
   (Bundle ID listede yoksa developer.apple.com → Certificates, Identifiers & Profiles →
   Identifiers → + ile ekle; EAS ilk derlemede kendisi de oluşturabilir.)
3. Kayıt açılınca **App Information → Apple ID** (sayı) alanını not et; `eas submit` sorarsa o.
4. Bilgisayarda: `cd app && npm install` ve `npx eas-cli login` (expo.dev hesabın).

## Derleme ve yükleme

```bash
cd app
npx eas-cli build -p ios --profile production   # Apple ID'nle giriş ister; sertifikaları EAS yönetir
npx eas-cli submit -p ios --latest              # App Store Connect'e yükler
```

Yüklemeden sonra App Store Connect işlemeyi bitirmek için 10–30 dakika alır (e-posta gelir).

## TestFlight ile kendi iPhone'unda dene (Apple incelemesi yok)

1. App Store Connect → uygulama → **TestFlight** → **Internal Testing** → grup oluştur
   (ör. "Ben") → kendi Apple ID'ni ekle.
2. iPhone'a App Store'dan **TestFlight**'ı kur, aynı Apple ID ile aç → Wasorty'yi **Install**.
   Geliştirici Modu ya da cihaz kaydı gerekmez. Her yeni derleme TestFlight'ta güncelleme olarak çıkar.

## App Store'a yayın (sonra)

Apple incelemesi ister. Şimdiki iskelet "yeterli işlev yok" gerekçesiyle reddedilir; oyun
ekranları, Google girişi ve gizlilik politikası hazır olunca:

- Gizlilik politikası adresi (ör. `https://mifarosa.com/wasorty/privacy.html`)
- App Privacy formu (hesap/Firebase, ileride reklam verileri)
- Ekran görüntüleri, açıklama, yaş derecesi, inceleme notu

## Build almadan güncelleme (EAS Update)

Uygulama `expo-updates` ile açılışta yeni JavaScript'i arar. Ekran, oyun kuralı, metin, renk gibi
JS değişiklikleri build hakkı harcamadan telefonlara gider:

```bash
cd app
npx eas-cli update --branch production --message "Ne değişti"
```

Telefon yeni sürümü açılışta indirir, bir sonraki açılışta uygular. Hatalı çıkarsa eski güncellemeyi
tekrar yayınlayarak geri alırsın (`npx eas-cli update:republish`).

**Yeni build gerekir:** yeni native paket (reklam, giriş gibi), `app.json`'daki native ayarlar
(izinler, simge, AdMob kimliği), Expo SDK yükseltmesi.

**Kural:** böyle bir değişiklik yapıldığında `app/app.json` içindeki `runtimeVersion`'ı artır
(`1.1.0` → `1.2.0`). Güncelleme yalnızca kendi `runtimeVersion`'ına sahip build'lere gider; eski
build, kendinde olmayan native kodu isteyen bir JS'i almasın diye.

Her build bir kanala bağlıdır (`eas.json` → `channel`); `production` profilinin kanalı
`production`'dır, güncellemeyi `--branch production` ile ona gönderirsin.

## Giriş (Apple ve Google)

Hesap ve günlük liderlik tablosu Firebase'te (`suloop-8ee05`, sitedekiyle aynı proje); Google ile
girince sitedeki hesapla aynı hesap olur.

- **Apple:** hazır. Apple Developer'da `com.mifarosa.wasorty` için _Sign in with Apple_ açık olmalı
  ve Firebase konsolunda _Authentication → Sign-in method → Apple_ etkin olmalı.
- **Google:** hazır. İki istemci kimliği `app/src/cloud/authConfig.js`'te, `REVERSED_CLIENT_ID` ise
  `app.json` → `plugins` içinde (`@react-native-google-signin/google-signin` → `iosUrlScheme`).
  Üçü aynı iOS kimliğinden türer; bir test bunların tutarlılığını kontrol eder. Kimlikler
  değişirse üçünü birlikte değiştir (native bir değişikliktir, `runtimeVersion` artar).
- Bağlantı yoksa oyun oynanır; hesap ve senkron hata gösterir, sonra yeniden dener.

## Build ve TestFlight'a gönderme, tek komutla

`eas.json` içinde `submit.production.ios.ascAppId` (App Store Connect'teki uygulamanın Apple ID'si,
TestFlight çökme raporlarında `itemID` olarak geçen sayı) yazılı, bu yüzden gönderirken bir şey
sormaz. Build bitince kendiliğinden TestFlight'a yüklensin:

```bash
cd app
npx eas-cli build -p ios --profile production --auto-submit
```

Ayrı ayrı yapmak istersen: `npx eas-cli build -p ios --profile production`, sonra
`npx eas-cli submit -p ios --latest`. Yüklemeden sonra App Store Connect işlemeyi bitirir
(10–30 dakika, e-posta gelir); sonra TestFlight'ta yeni sürümü kurarsın.

Şifreleme (export compliance) sorusu çıkmaz: `app.json` → `ITSAppUsesNonExemptEncryption` `false`.

## Build'i GitHub'da almak (EAS bulut kotasını harcamaz)

`.github/workflows/ios-build.yml`, iOS build'ini GitHub'ın macOS makinesinde `eas build --local` ile
alır. İmza sertifikaları ve provisioning profile EAS'ta durur (ayrı `.p12` ya da `.mobileprovision`
gerekmez); build'in kendisi GitHub'da çalıştığı için EAS'ın aylık build hakkından düşmez. Depo herkese
açık olduğu için macOS dakikaları ücretsizdir. Bir build 30–60 dakika sürer.

Bir kerelik kurulum:

1. **Expo erişim anahtarı:** expo.dev → hesabın → _Access tokens_ → _Create token_. Anahtarı kopyala.
2. **GitHub gizli değişkeni:** depo → _Settings → Secrets and variables → Actions → New repository
   secret_; adı `EXPO_TOKEN`, değeri o anahtar. (Anahtarı kimseye gönderme, koda yazma.)
3. **TestFlight'a otomatik yükleme için** (istersen): App Store Connect API anahtarını EAS'a bir kez
   tanıt: `npx eas-cli credentials -p ios` → _App Store Connect: Manage your API Key_. Bunu yapmadan
   build alınır, yükleme elle yapılır.

Çalıştırma: GitHub → _Actions → iOS build → Run workflow_ (isteğe bağlı _submit_ kutusu: build
bitince TestFlight'a yükler). Build edilen `.ipa` bir gün boyunca iş akışının sonunda indirilebilir;
elle yüklemek için: `npx eas-cli submit -p ios --path wasorty.ipa`.

Sınırlar: bu yol **production** build içindir (TestFlight'a gider). Telefona doğrudan kurulan
**development build**'in kurulum linkini yalnızca EAS bulutu verir, onu GitHub'da alamazsın.
