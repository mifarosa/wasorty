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
