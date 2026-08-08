# bs-adaptif

**Adaptif Öğrenme Platformu.** Öğrencilerin kazanım bazlı ilerlemesini izler, adaptif çalışma planı oluşturur, sınav blueprint yönetimi ve rubrik tabanlı değerlendirme sağlar.

## Teknolojiler

| Teknoloji | Amaç |
|-----------|------|
| Angular 22 | Standalone components, signal-based state |
| Tailwind CSS 4 | Utility-first styling |
| Angular Material | UI component library (Material Design) |
| Chart.js + chartjs-plugin-zoom | Grafikler (trend, karşılaştırma) |
| RxJS | Reaktif veri akışı |
| Vitest | Unit/entegrasyon testleri |
| localStorage | State kalıcılığı |

## Kurulum ve Çalıştırma

```bash
npm install          # bağımlılıkları yükle
npm start            # geliştirme sunucusu → http://localhost:4200
npm run build        # production build → dist/bs-adaptif/
npm test             # testleri çalıştır (Vitest)
```

## Demo Hesapları

`/switch-role` üzerinden kullanıcı değiştirilebilir. Sağ üst köşedeki kullanıcı adı menüsünden de geçiş yapılır (audit log'a kaydedilir).

| ID | İsim | Rol |
|:---|------|-----|
| 1 | Platform Yöneticisi | Platform Yöneticisi |
| 2 | Ahmet Yılmaz | Eğitmen |
| 3 | Ayşe Demir | Eğitmen |
| 4 | Ali Korkmaz | Öğrenci |
| 5 | Zeynep Arslan | Öğrenci |
| 6 | Dr. Mehmet Can | Ölçme Uzmanı |
| 7 | Elif Yıldız | Program Yöneticisi |
| 8 | Ali Rıza | Gözlemci |
| 9 | Mehmet Kaya | Eğitmen |
| 10 | Fatma Öztürk | Eğitmen |

## Kullanıcı Rolleri

| Rol | Sorumluluk |
|-----|-----------|
| **Platform Yöneticisi** | Rol, izin, dönem, öğrenci ve sistem parametrelerini yönetir |
| **Program Yöneticisi** | Kazanım haritası, program, cohort ve yayın süreçlerini yönetir |
| **Eğitmen** | İçerik, soru, rubrik, değerlendirme ve öğrenci listesini yönetir |
| **Ölçme Uzmanı** | Soru kalitesi, sınav blueprint, zorluk ve ayırt edicilik analizlerini inceler |
| **Gözlemci** | Yetkili cohort ve öğrenci listesini salt okunur görüntüler |
| **Öğrenci** | Atanan dersleri, adaptif çalışma planını ve sınav oturumlarını kullanır |

## Sayfalar ve Rotalar

| Route | Sayfa | Erişim |
|-------|-------|--------|
| `/learning/dashboard` | Öğrenme Panosu (KPI, grafikler, plan) | Tüm roller |
| `/courses` | Kurs listesi (filtre, kayıt, öğrenme yolu) | Tüm roller |
| `/courses/:id/path` | Öğrenme Yolu (içerik ağacı, ilerleme) | Öğrenci, Eğitmen |
| `/courses/:id/edit` | Kurs düzenleme | Yönetici, Eğitmen |
| `/courses/:id/details` | Kurs detay ve katılımcılar | Tüm roller |
| `/outcomes` | Kazanım listesi (filtre, CRUD) | Yönetici, Eğitmen |
| `/outcomes/map` | Kazanım grafiği (zoom, pan) | Yönetici, Eğitmen |
| `/question-bank` | Soru bankası (versiyon, yayın) | Eğitmen, Ölçme Uzmanı |
| `/questions/:id` | Soru detay (versiyon geçmişi, revert) | Eğitmen, Ölçme Uzmanı |
| `/exam-builder?examId=N` | Sınav blueprint oluşturucu | Yönetici, Eğitmen, Ölçme Uzmanı |
| `/exams` | Sınav listesi (başla, devam et, yayınla) | Tüm roller |
| `/exam-session/:token` | Sınav oturumu (çevrimdışı destekli) | Öğrenci |
| `/grading` | Notlandırma listesi (filtre) | Eğitmen |
| `/grading/rubrics` | Rubrik yönetimi | Eğitmen |
| `/grading/:attemptId` | Notlandırma detay (rubrik grader) | Eğitmen |
| `/student/:id/analytics` | Öğrenci analitiği (başarım, trend) | Eğitmen, Gözlemci, Program Yöneticisi |
| `/participant/:id/edit` | Profil düzenleme | Yönetici, Eğitmen |
| `/item-analysis` | Madde analizi (zorluk, ayırt edicilik) | Ölçme Uzmanı |
| `/audit-log` | Denetim kaydı | Platform Yöneticisi |
| `/my-plan` | Adaptif çalışma planı | Öğrenci |
| `/cohorts` | Cohort listesi (CRUD, filtre, öğrenci atama) | Platform/Program Yöneticisi, Gözlemci |
| `/cohorts/analytics` | Cohort karşılaştırma analizi | Platform/Program Yöneticisi, Gözlemci |
| `/admin/roles` | Rol ve izin matrisi | Platform Yöneticisi |
| `/admin/terms` | Dönem yönetimi | Platform Yöneticisi |
| `/admin/students` | Öğrenci yönetimi (liste, filtre, ekle/düzenle) | Platform/Program Yöneticisi, Eğitmen, Ölçme Uzmanı, Gözlemci |
| `/switch-role` | Kullanıcı değiştirme | Tüm roller |
| `/403` | Erişim reddi | Tüm roller |

## Rol Bazlı Erişim Matrisi

| Sayfa | Platform Yöneticisi | Program Yöneticisi | Eğitmen | Ölçme Uzmanı | Gözlemci | Öğrenci |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|
| Öğrenme Panosu | R | R | R | R | R | RW |
| Kurslar | CRUD | CRU | RU | R | R | R |
| Öğrenme Yolu | R | R | R | R | R | RW |
| Kazanımlar | CRUD | CRUD | CRUD | R | — | — |
| Kazanım Grafiği | R | R | R | — | — | — |
| Soru Bankası | — | — | CRUD | CRUD | — | — |
| Sınav Oluşturucu | CRUD | CRUD | CRUD | CRUD | — | — |
| Sınavlar | CRUD | CRUD | CRUD | CRUD | R | RW |
| Sınav Oturumu | — | — | — | — | — | RW |
| Notlandırma | — | — | CRUD | R | — | — |
| Rubrik Yönetimi | — | — | CRUD | — | — | — |
| Öğrenci Analitiği | — | R | R | R | R | R |
| Madde Analizi | — | — | R | CRUD | — | — |
| Denetim Kaydı | R | — | — | — | — | — |
| Adaptif Plan | — | — | — | — | — | RW |
| Cohortlar | CRUD | CRUD | — | — | R | — |
| Cohort Analizi | R | R | — | — | R | — |
| Öğrenci Yönetimi | CRUD | CRUD | R | R | R | — |
| Rol ve İzinler | R | — | — | — | — | — |
| Dönem Yönetimi | CRUD | — | — | — | — | — |

C = Create, R = Read, U = Update, D = Delete

## İzin Sistemi

10 kategori altında 33 izin anahtarı. `permission-constants.ts` içinde her rolün izinleri tanımlıdır. Route guard'lar `data.permissions` ve `data.roles` üzerinden erişimi kontrol eder. `PermissionService` çalışma zamanında izin sorgulama sağlar.

| Kategori | İzinler |
|----------|--------|
| Kurs | `course_create`, `course_read`, `course_update`, `course_delete`, `course_publish` |
| Sınav | `exam_create`, `exam_read`, `exam_update`, `exam_delete`, `exam_publish` |
| Soru | `question_create`, `question_read`, `question_update`, `question_delete`, `question_publish` |
| Notlandırma | `grading_read`, `grading_grade`, `grading_override` |
| Analitik | `analytics_read` |
| Cohort | `cohort_create`, `cohort_read`, `cohort_update`, `cohort_delete` |
| Kazanım | `outcome_create`, `outcome_read`, `outcome_update`, `outcome_delete` |
| Denetim | `audit_read` |
| Sistem | `system_manage_roles`, `system_manage_terms`, `system_manage_students` |
| Öğrenci | `student_plan`, `student_profile` |

## Seed Veri

| Entity | Adet |
|--------|:----:|
| Kurs | 6 |
| Eğitmen | 4 |
| Katılımcı | 16 |
| Sınav | 7 |
| Soru | 25 |
| Kazanım | 16 |
| Blueprint | 7 |
| Cohort | 3 |
| Kayıt | 16 |
| Sınav Denemesi | 12 |
| İçerik | 11 |
| Rubrik | 2 |

Seed veri `src/app/core/data/seed-specs/` altında tanımlanır. `SNAPSHOT_VERSION = 10` ile localStorage'da versiyonlanır. `/switch-role` > "Verileri Sıfırla" tüm veriyi seed'e döndürür.

## Mimari

```
src/app/
  core/
    auth/           CurrentUserService, PermissionService, DataScopeService, SessionService
    api/            MockApiService (gecikme, hata, conflict simülasyonu)
    data/           Seed veri (seed-specs/, seed-generator.ts, seed-persist.ts)
    models/         Tüm interface ve enumlar
    state/          EntityStore (signal-based state), EventBusService
    storage/        StorageService (localStorage), DraftStore, OfflineQueueService
    guards/         RoleGuard (izin + rol kontrolü)
    realtime/       Activity stream
  shared/
    components/     15 paylaşımlı bileşen (KpiCard, Heatmap, Graph, vb.)
    pipes/          StatusText, DateFormat
    directives/     Debounce
    utils/          CSV export, memoize, cycle detector
  features/
    learning/       Öğrenme panosu
    courses/        Kurs listesi, detay, öğrenme yolu
    outcomes/       Kazanım listesi, kazanım grafiği
    questions/      Soru bankası, versiyonlama
    exam-builder/   Sınav blueprint oluşturucu
    exams/          Sınav listesi, sınav başlatma
    exam-session/   Sınav oturumu
    grading/        Notlandırma, rubrik yönetimi
    student-analytics/  Öğrenci analitiği
    participant-edit/   Profil düzenleme
    item-analysis/  Madde analizi
    audit-log/      Denetim kaydı
    cohort-management/  Cohort listesi, kohort analitiği
    adaptive-plan/  Adaptif çalışma planı
    role-switch/    Rol/kullanıcı değiştirme
    admin/          Rol-izin matrisi, dönem yönetimi, öğrenci yönetimi
    student-dashboard/  Öğrenci veri facade'ı
```

## İş Kuralları

1. **Sınav puanlama**: `net = doğru - (yanlış / wrongAnswerPenalty)`, `score = (doğru / toplam) * 100`, `passed = score >= passingScore`. Varsayılan ceza: 4.
2. **Sınav tekrar girme**: Tamamlanan veya taslakta bırakılan sınavlara tekrar girilemez.
3. **Blueprint kısıtlamaları**: Otomatik soru seçimi kazanım, zorluk ve soru tipi kısıtlamalarına uyar. Toplam puan 100'ü aşamaz.
4. **Soru versiyonlama**: Yayındaki sorularda değişiklik yeni versiyon oluşturur. Geçmiş versiyonlara geri dönülebilir.
5. **Çevrimdışı sınav**: Cevaplar `DraftStore`'a kaydedilir, bağlantı gelince senkronize edilir.
6. **Kazanım başarımı**: `< 60` zayıf, `>= 80` güçlü. Başarım geçmişi trend grafiğinde gösterilir.
7. **Sınav blueprint**: Kazanım kapsamı kısıtlamalarla tanımlanır. Kısıtlama ihlalleri UI'da uyarı olarak gösterilir.

## State Yönetimi

- **Signals + RxJS** — Angular Signals (`signal`, `computed`, `effect`) ile state yönetimi; RxJS (`Observable`, `firstValueFrom`) ile async veri katmanı
- **EntityStore** — `exams`, `blueprints`, `questions`, `sessions`, `cohorts`, `participants` sinyallerini merkezi olarak tutar
- **localStorage kalıcılığı** — `effect()` ile otomatik kayıt, sayfa yenilemede hydrasyon; `DATA_VERSION` ile versiyon kontrolü
- **QuestionBankFacade** — Soru bankası için ayrı `qb_*` localStorage kalıcılığı
- **Cross-tab sync** — `window.storage` event ile sınav oturumları sekmeler arası senkronize
- **MockApiService** — Tüm HTTP çağrılarını simüle eder (100ms gecikme, hata simülasyonu, conflict detection, retry desteği)

## Bileşen Özellikleri

- Tüm listelerde sayfalama (5/10/25/50)
- Tüm listelerde sıralama (`mat-sort-header`)
- Filtreler responsive grid ile yan yana, mobilde alt alta
- Arama input'larında debounce (300ms, `DebounceDirective`)
- Rol bazlı buton/element gizleme (`@if` + `PermissionService`)
- Sticky sütunlar: `relative md:sticky` (mobilde scroll, masaüstünde sabit)
- Collapsible bölümler (`chevron_right` rotasyonu)
- Kazanım grafiği: scroll-zoom ve drag-pan desteği (SVG viewBox)
- Grafikler: Chart.js + chartjs-plugin-zoom (tekerlek zoom, pinch, pan)
- Otomatik kaydetme göstergesi (sınav oturumlarında)
- Onay dialog'ları (yapılandırılabilir ikon ve mesaj)

## Bilinen Sınırlamalar

- **localStorage tabanlı**: Veriler tarayıcı temizliğinde kaybolur. Gerçek backend yok.
- **Mock API**: Tüm veri memory'de. Sayfa yenilemede sadece EntityStore entitileri kalıcı, diğerleri seed'e döner.
- **Çoklu sekme**: Sadece `sessions` cross-tab sync destekler. Diğer entitilerde son yazan kazanır.
