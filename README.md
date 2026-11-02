# To-Do List

[Forjr](https://www.npmjs.com/package/forjr) ile yazılmış, çok kullanıcılı, Türkçe bir yapılacaklar uygulaması.

- Kayıt olma, giriş ve çıkış (şifreler hash'lenerek saklanır, hatalı denemeler sınırlanır)
- Görevler: öncelik, son tarih, açıklama, alt görevler ("adımlar"), proje ve etiketler
- Filtreler (Hepsi / Aktif / Tamamlanan / projeye göre) ve ilerleme çubuğu
- Her kullanıcı yalnızca kendi verisini görür ve değiştirebilir
- Kişiselleştirme: tema (sistem / açık / koyu), vurgu rengi, yazı boyutu, yoğunluk, sıralama, tamamlananları gizleme. Ayarlar hesaba kaydedilir, her cihazda aynı gelir
- Mobil uyumlu; renkler WCAG AA (4.5:1) kontrastını iki temada da geçer

## Çalıştırma

npm gerekir (Forjr kendi çalıştığı Node.js sürümünü getirir).

```bash
npm install
npx forjr dev --port 3000
```

Ardından http://localhost:3000 adresini açıp `/sign-up` sayfasından bir hesap oluşturun.

| Komut | Ne yapar |
|---|---|
| `npx forjr dev` | Geliştirme sunucusu (dosya değişince yeniden yükler) |
| `npx forjr check` | Bütün kuralları ve tip denetimini çalıştırır, her hatayı düzeltme önerisiyle yazar |
| `npx forjr test` | `tests/` altındaki testleri çalıştırır; değişmeyen testleri yeniden oynatır (`--all` hepsini çalıştırır) |
| `npx forjr build` | Üretim paketini `.forjr/build/` içine yazar |
| `npx forjr map` | Uygulamanın kısa haritası: her tanım, kim çağırabilir, neyi okur/yazar |

Veritabanı `.forjr/data.db` içinde durur ve depoya eklenmez.

## Proje yapısı

```
forjr.ts              Proje tanımı: başlık, giriş sayfası, dil
functions/
  users.ts            users tablosu, kayıt (signUp)
  signIn.ts           giriş
  signOut.ts          çıkış
  profile.ts          kendi profilini okuma, görünüm tercihleri, görünen ad
  tasks.ts            görevler
  subtasks.ts         alt görevler
  projects.ts         projeler
  tags.ts             etiketler ve görev-etiket bağları
screens/
  home.tsx, home.css  ana ekran ve ayarlar paneli; tasarım token'ları home.css başında
  signIn.tsx, signUp.tsx, auth.css
messages/tr.ts        Türkçe form ve hata mesajları
tests/                node:test ile yazılmış uygulama testleri
```

## Forjr'ı nasıl kullandım

Forjr'da uygulama, `export const ad = kelime('ad', { ... })` biçimindeki **tanımlardan** oluşur. Motor bu tanımları okur: veritabanını, API'yi, erişim denetimini ve sayfaları kendisi kurar. Aşağıda bu projede kullandığım parçalar ve neden öyle kullandığım var.

### 1. Tablolar ve erişim kuralları

Her tablo kimin okuyup yazabileceğini kendisi söyler. Bir kural yazılmazsa `'nobody'` sayılır.

```ts
export const tasks = table('tasks', {
  columns: {
    title: text({ min: 1, max: 200 }),
    ownerId: link('users', { optional: true }),
    project: link('projects', { optional: true, onRemove: 'clear' }),
    priority: choice(['low', 'medium', 'high'], { default: 'medium' }),
    // ...
  },
  owner: 'ownerId',
  access: { read: 'owner', add: 'signedIn', change: 'owner', remove: 'owner' },
})
```

- `owner: 'ownerId'`: satırı ekleyen kullanıcı bu sütuna motor tarafından yazılır.
- `read: 'owner'`: sorgular sadece çağıranın kendi satırlarını döndürür. Kullanıcılar arası ayrımı uygulama kodunda filtreyle değil, tablonun kuralıyla yaptım; böylece bir sorguyu unutmak veri sızdırmaz.
- `onRemove`: bağlı satır silinince ne olacağı. Proje silinince görev projesiz kalır (`'clear'`), görev silinince alt görevleri ve etiket bağları da silinir (`'remove'`). Bu yazılmadan bağlı bir satır silinemiyordu; testler yakaladı.

### 2. Sorgular ve değişiklikler

Veri yalnızca bir `change` ile yazılır, `query` yalnızca okur. İkisi de bildirimsel (declarative) yazılır:

```ts
export const activeTasks = query('activeTasks', {
  access: 'signedIn',
  rows: tasks.where({ done: false }).newest('createdAt').limit(50),
})

export const savePreferences = change('savePreferences', {
  access: 'signedIn',
  input: { theme: choice(['system', 'light', 'dark']), /* ... */ },
  set: users.change(caller('id'), { theme: input('theme'), /* ... */ }),
})
```

`caller('id')` çağıran kullanıcıyı temsil eder; kullanıcı kendi kaydı dışında hiçbir satırı değiştiremez.

### 3. Girdiye bakan kurallar: `allow`

Başka birinin görevine alt görev ya da etiket eklenmesin diye, bağlanan satırın çağırana ait olduğunu kontrol ettim. `allow` kuralına verilen `db` çağıranın gözüyle okur, yani başkasının satırını görmez:

```ts
access: allow((user, input, db) => !!user && db.tasks.where({ id: input.taskId }).count() > 0),
```

### 4. Giriş sistemi

Forjr hazır bir giriş sistemi vermez; parçaları verir ve giriş, projenin kendi kodudur. `forjr docs topic.signIn` sayfasını izledim:

- `passwords.hash` / `passwords.check`: şifre düz metin olarak saklanmaz. `password` sütunu `private: true` olduğu için hiçbir sorgu onu döndürmez.
- `attempts.limit`: bir e-posta için 10 dakikada 5'ten fazla hatalı deneme engellenir (hesap başına toplamda saatte 50).
- `sessions.start(user.id)` / `sessions.end()`: tarayıcıya JavaScript'in okuyamadığı (`HttpOnly`, `SameSite=Lax`) bir oturum çerezi koyar.
- Kayıt, `access: 'nobody'` olan bir `addUser` değişikliğine `call` ile ulaşır; dışarıdan kimse doğrudan kullanıcı yazamaz.
- `project({ signInPath: '/sign-in' })`: giriş isteyen bir sayfaya gelen ziyaretçi oraya yönlendirilir.

### 5. Ekranlar

Bir `screen` React'tir. `data` ile sorguları okur; `Form` ve `useCall` ile değişiklikleri çağırır:

```tsx
export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'signedIn',
  data: { active: read(activeTasks), me: read(myProfile) /* ... */ },
  view: ({ active, me }) => (
    <Form call={addTask} reset> ... </Form>
  ),
})
```

- `Form`, girdileri tanımdaki tiplere göre hem tarayıcıda hem sunucuda denetler.
- `useCall(fn, { optimistic })` ile alt görevi işaretlemek gibi işler sunucuyu beklemeden ekranda görünür.
- Stiller düz CSS. Bütün renkler `home.css` başında CSS değişkeni (token). Açık/koyu tema için CSS'in `light-dark()` fonksiyonunu kullandım; "Sistem" seçeneği ek kod gerektirmeden bilgisayarın temasını takip eder.

### 6. Dil

`project({ languages: ['tr'] })` ve `messages/tr.ts` ile hem form doğrulama mesajları (`forjr.required`, `forjr.min` …) hem de uygulamanın kendi hata kodları (`fail.wrong-sign-in`, motorun deneme sınırı için `fail.F0005`) Türkçe gösterilir.

### 7. Testler

`forjr/test` her test için boş bir veritabanıyla uygulamanın ayrı bir kopyasını açar:

```ts
const app = await testApp()
const ali = await app.user({ email: 'ali@ornek.test', roles: [] })
await app.as(ali).call('addTask', { title: 'Alinin gorevi', priority: 'high' })
await assert.rejects(app.as(ayse).call('removeTask', { id: aliTask.id }))
```

Testler şunları doğruluyor: kayıt ve giriş (çerez gerçekten geliyor mu, şifre hash'leniyor mu, yanlış şifre ve şifresiz eski hesap reddediliyor mu), kullanıcı izolasyonu (okuma, değiştirme, silme ve başkasının satırına bağlama), silme davranışları ve tercihlerin kaydı. `forjr check`, hiçbir testin dokunmadığı tanımları ayrıca uyarı olarak listeler.

### Yolda öğrendiklerim

- **Her değişiklikten sonra `forjr check`.** Bütün hataları bir kerede, her birinin düzeltmesiyle verir. `forjr docs <kod>` o hatayı açıklar.
- **Bir `run` gövdesi Forjr'ın kendi kelimeleriyle sınırlıdır.** Bir okumanın sonucunda metot çağırmak (`.trim()` gibi) bazı yerlerde `F0013` verir.
- **`/_f/call/<ad>` çağrısının gövdesi `{ "input": { ... } }` biçimindedir**, girdiler doğrudan gövdeye yazılmaz.
- **Geliştirme sunucusunda karşılaştığım bir hata:** İki ekran aynı fonksiyon dosyasından farklı tanımlar alınca, sıcak yeniden yüklemeden sonra tarayıcı paketi bazen birinin export'unu kaybediyordu ("does not provide an export named …"). Üretim derlemesinde (`forjr build`) bu olmuyor. Çözüm olarak, ekranların kullandığı fonksiyonları ayrı dosyalara böldüm (`signIn.ts` / `signOut.ts`, `users.ts` / `profile.ts`).
- **Sabit renk yerine token.** Kişiselleştirme (tema, vurgu rengi, yoğunluk) ancak bütün renkler değişkenlere taşındıktan sonra mümkün oldu.
