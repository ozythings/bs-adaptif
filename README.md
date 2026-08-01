# BS Adaptif — Adaptif Eğitim, Sınav ve Öğrenme Analitiği Platformu

Angular 22 standalone tabanlı, kural tabanlı adaptif öğrenme, sınav yönetimi ve öğrenme analitiği platformu.

## Özellikler

- **Öğrenme Dashboard**: Öğrenci ustalık puanları, önerilen içerikler, aktif oturumlar, aktivite akışı
- **Kurslar ve Öğrenme Yolu**: Kazanım tabanlı içerik sıralaması, önkoşul kontrolleri
- **Kazanım Haritası**: Döngüsellik kontrollü graph görünümü, arama ve odak modu
- **Soru Bankası**: Çoklu soru tipi (MC, TF, SA, Essay), versiyonlama, yayın akışı
- **Sınav Oluşturucu**: Blueprint kısıtları, otomatik soru seçimi, kapsama analizi
- **Sınav Oturumu**: Süreli sınav, autosave, offline kuyruk, çakışma tespiti
- **Değerlendirme**: Rubrik tabanlı puanlama, otomatik/skor hesaplama
- **Adaptif Öneri Motoru**: Kural tabanlı içerik önerisi, açıklanabilir gerekçe
- **Öğrenme Analitiği**: Ustalık ısı haritası, öğrenci bazlı raporlama
- **Cohort Karşılaştırması**: Minimum öğrenci gizlilik kuralı
- **Madde Analizi**: Canlı hesaplanan zorluk/ayırt edicilik/seçenek analizi
- **Denetim Kaydı**: Tüm kritik işlemlerin filtrelenebilir log kaydı

## Roller

| Rol | Açıklama | Yetkiler |
|-----|----------|----------|
| Platform Yöneticisi | Sistem yönetimi | Tüm yetkiler (diğer tüm rolleri kapsar) |
| Program Yöneticisi | Program, cohort, kazanım haritası | Kazanım yönetimi, cohort analizi |
| Eğitmen | İçerik, sınav, değerlendirme | Kurs, soru bankası, değerlendirme, öğrenci analizi |
| Ölçme Uzmanı | Soru kalitesi, blueprint | Soru bankası, blueprint, madde analizi |
| Öğrenci | Adaptif çalışma, sınav | Dashboard, kurslar, sınav oturumu |
| Gözlemci | Salt okunur raporlar | Cohort ve öğrenci analitiği (kısıtlı) |

## Demo Hesapları

Rol değiştirmek için sağ üstten kullanıcı adına tıklayın.

| Kullanıcı | Rol | ID |
|-----------|-----|-----|
| Admin | Platform Yöneticisi | 1 |
| Ahmet Yılmaz | Eğitmen | 2 |
| Ayşe Demir | Eğitmen | 3 |
| Ali Korkmaz | Öğrenci | 4 |
| Zeynep Kaya | Öğrenci | 5 |
| Dr. Mehmet Can | Ölçme Uzmanı | 6 |
| Elif Yıldız | Program Yöneticisi | 7 |
| Ali Rıza | Gözlemci | 8 |

## Kurulum ve Çalıştırma

```bash
npm install
npm start        # ng serve → http://localhost:4200
npm test         # Vitest unit/integration testleri
npx ng build     # Production build (dist/bs-adaptif/)
```

## Mimari

```
src/app/
├── core/
│   ├── api/          # Mock API (gecikme, hata, conflict simülasyonu)
│   ├── auth/         # Session, kullanıcı, rol hiyerarşisi, veri kapsamı
│   ├── data/         # Seed veriler (ilişkili demo veri seti)
│   ├── engine/       # İş kuralları motoru (skor, mastery, öneri)
│   ├── guards/       # RoleGuard (rol hiyerarşisi tabanlı route koruması)
│   ├── models/       # Tüm interface/enum tanımları
│   ├── observability/# Audit log, bildirim servisi
│   ├── optimistic/   # Optimistic update + rollback
│   ├── realtime/     # Activity stream (RxJS interval tabanlı SSE simülasyonu)
│   └── storage/      # localStorage adaptörü, offline kuyruk, conflict resolver
├── shared/
│   ├── components/   # 8+ shared bileşen
│   ├── directives/   # Debounce directive
│   ├── pipes/        # StatusText, DateFormat
│   └── validators/   # Senkron + asenkron validatörler
└── features/         # Feature-based modüller (her biri data-access facade ile)
```

## Rotalar

| Rota | Açıklama |
|------|----------|
| `/learning/dashboard` | Öğrenme dashboard'u |
| `/courses` | Kurs listesi |
| `/courses/:id/path` | Kurs öğrenme yolu |
| `/outcomes` | Kazanım listesi |
| `/outcomes/map` | Kazanım grafiği |
| `/question-bank` | Soru bankası |
| `/questions/:id` | Soru detayı |
| `/exam-builder` | Sınav oluşturucu (blueprint) |
| `/exams` | Sınav listesi |
| `/exam-session/:token` | Sınav oturumu |
| `/grading` | Değerlendirme listesi |
| `/grading/:attemptId` | Değerlendirme detayı |
| `/student/:id/analytics` | Öğrenci analitiği |
| `/cohort-analytics` | Cohort karşılaştırması |
| `/item-analysis` | Madde analizi |
| `/audit-log` | Denetim kaydı |
| `/rol-degistir` | Rol değiştirme |
| `/403` | Yetkisiz erişim |

## Teknik Kararlar ve Bilinen Kısıtlar

- **Mock API**: Gerçek HTTP olmadan gecikme/hata/conflict simülasyonu yapar
- **State yönetimi**: Angular Signals + RxJS, NgRx kullanılmadı
- **Versiyonlama**: Sorular yayınlandıktan sonra yeni versiyon oluşturur; sınav versiyonlaması model seviyesinde var, UI eksik
- **Graph performansı**: SVG tabanlı, yüzlerce düğüm senaryosu için sanal render yok
- **Offline queue**: localStorage tabanlı, FIFO sıralı senkronizasyon + backoff retry
- **Cross-tab conflict**: BroadcastChannel API ile çakışma tespiti
- **Seed veri**: 7 sınav, 25 soru, 6 deneme, 11 ustalık skoru, 3 cohort içeren ilişkili demo set
