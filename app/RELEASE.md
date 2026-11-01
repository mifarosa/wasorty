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

## Google ile giriş (eski ilerlemeni getirmek için)

Aynı Google hesabıyla girince web'de kaydettiğin ilerleme, günlük sonuçların ve kullanıcı adın
buluttan gelir; telefondakiyle birleşir, hiçbir şey azalmaz.

Ek bir kurulum gerekmez: Firebase iOS uygulamasının (Bundle ID `com.mifarosa.wasorty`, proje
**suloop-8ee05**) istemci kimliği ve URL şeması `app/googleConfig.js`'te durur. Bu kimlikler
herkese açıktır (her derlenmiş uygulamanın içinde zaten bulunur), parola değildir. Firebase
konsolunda Authentication → Sign-in method → **Google** açık olmalı.

Başka bir Firebase iOS uygulaması kullanmak istersen o uygulamanın `GoogleService-Info.plist`
dosyasını derlemeye ver (repoya koyma):

```bash
cd app
npx eas-cli env:create --name GOOGLE_SERVICES_PLIST --type file \
  --value ./GoogleService-Info.plist --environment production --visibility secret
```
