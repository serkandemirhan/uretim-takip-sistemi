# Tablo Standardizasyon Planı (Mevcut Sistem)

Kurumsal uygulamanın mevcut tablo implementasyonlarını koruyarak, ortak bir API ve görsel dil üzerinden standardize etmek için önerilen yaklaşım aşağıdadır. Hedef; hâlihazırda kullanılan shadcn tabanlı `Table` bileşenleri ile devam etmek, ancak satır içi işlemler, durum rozetleri, sıralama/filtreleme, kolon görünürlüğü, genişlik ayarları (localStorage saklama) ve gruplayıcı başlıklar gibi ihtiyaçları tek bir çatı altında toplamak.

## Amaç
- Mevcut tablo kodlarının parçalı yapısını tek bir bileşen ailesi üzerinden yönetmek.
- Aynı tablo davranışını (aksiyonlar, badge/statu gösterimi, kolon yönetimi, satır yüksekliği) farklı sayfalarda tekrar etmeyi engellemek.
- Kolon tercihleri, filtreler ve görünümü kullanıcı bazlı olarak localStorage’da saklamak.
- Gelişmiş sayfalar (Görevler, Stok Envanteri) ile basit listeler (Roller, HR doküman tipleri) arasında paylaşılan çekirdek kod oluşturmak.

## Mevcut Tablo Envanteri

| Modül | Dosya | Özellikler | Notlar |
| --- | --- | --- | --- |
| Roller | `apps/web/app/(dashboard)/roles/page.tsx:67` | Basit kolonlar, aksiyon butonları, DataTable v1 kullanımı | Standart component'e geçiş için en düşük çaba |
| Görevler (All Tasks) | `apps/web/app/(dashboard)/tasks/all/page.tsx:90` | Kolon bazlı filtre, sıralama, drag & drop kolon sırası, görünürlük, genişlik, grup başlıkları, localStorage | En karmaşık manuel implementasyon |
| Stok Envanteri | `apps/web/app/(dashboard)/stocks/inventory/page.tsx:221` | Dinamik kolonlar, kolon paneli, sürükle-bırak, width resize, summary kartları, localStorage | DataTable çekirdeğinin gelişmiş sürümü |
| Dosya Gezgini | `apps/web/app/(dashboard)/files/explorer/page.tsx:154` | Hiyerarşik filtre, liste/grid toggle, ikonlaştırma, satır aksiyonları | Tablo + kart görünümü karışık |
| HR Doküman Ayarları | `apps/web/app/(dashboard)/settings/hr/documents/page.tsx:130` | İki ayrı liste (tipler, zorunluluklar), CRUD modalları, izin kontrollü aksiyonlar | DataTable ile API uyumu sağlanmalı |
| Kullanıcı HR Sekmesi | `apps/web/app/(dashboard)/users/[id]/page.tsx:423` | Kategori filtresi, durum badge, aksiyon butonları | Profil ekranı içinde tablo |
| Teklifler | `apps/web/app/(dashboard)/quotations/page.tsx:20` | Arama, durum/müşteri filtreleri, badge, aksiyonlar | Basit + filtreli senaryo |
| İş Malzemeleri / Takibi | `apps/web/components/features/jobs/tabs/JobMaterialsTab.tsx:1`, `.../JobMaterialTrackingTab.tsx:1` | Filtreler, status rozetleri, detay modalları | Tablo davranışı farklı modüllerde tekrar ediyor |

## Paylaşılan Bileşenler ve Sınırlamalar
- `DataTable` (`apps/web/components/shared/data-table/DataTable.tsx:1`): Basit liste + aksiyonları destekliyor ancak sıralama, kolon yönetimi, filtre toolbar’ı, satır yoğunluğu gibi özellikler yok.
- `TableSkeleton`, `EmptyState`, `SearchBar` (`apps/web/components/shared/data-table/*.tsx`): Halihazırda var, birçok sayfada manuel loader/empty state bulunuyor.
- Çoğu gelişmiş tabloda kendi state yönetimi ve localStorage kodu tekrar ediyor (`tasks/all` ve `stocks/inventory`).

## Özellik Açığı vs. Hedef

| Özellik | Mevcut Durum | Hedef |
| --- | --- | --- |
| Sıralama | `tasks/all` içinde özel (`apps/web/app/(dashboard)/tasks/all/page.tsx:447`) | `ColumnDef` bazlı deklaratif `sortable` bayrağı |
| Filtre Toolbar | Her sayfada farklı | Ortak `DataTableToolbar` + filtre chip’leri |
| Kolon Görünürlüğü & Order | `tasks/all`, `stocks/inventory` manuel | `useTablePreferences` hook + panel |
| Kolon Genişliği & Persist | Manuel localStorage (`tasks/all`:296, `stocks/inventory`:397) | Çekirdek `preferences` servisinde toplamak |
| Grup Başlıkları | `tasks/all` (`apps/web/app/(dashboard)/tasks/all/page.tsx:495`) | Opsiyonel `groupBy` desteği |
| Satır Yoğunluğu / Yüksekliği | Lokal Tailwind sınıfları | `density` prop (comfortable/compact) |
| Header Stil | Sayfadan sayfaya farklı | Tema katmanında (`DataTableHeader`, `TableTheme`) |
| Aksiyon Kolonu | DataTable v1 + tüm manuel tablolar | Aynı API üzerinden |

## Hedef Mimarisi

### 1. DataTable Core
- `DataTable` içindeki `ColumnDef` arayüzünü `meta` alanı ile genişlet: `sortable`, `filterType`, `badge`, `align`, `groupable`.
- Tablonun render kısmını minimumda tutup, state yönetimini `useDataTableState(tableId, initialState)` hook’una taşı.
- `tableId` zorunlu prop olarak verilerek localStorage anahtarı standardize edilir.

### 2. Toolbar ve Filtre Mimarisi
- `DataTableToolbar` bileşeni; global arama, kolon bazlı filtre inputları, aktif filtre chip’leri ve “Temizle” aksiyonunu yönetir.
- Filtre tipleri (`text`, `select`, `date`, `range`) `ColumnDef.meta.filter` tanımına göre otomatik çizilir; Tasks sayfasındaki konfigürasyon (`apps/web/app/(dashboard)/tasks/all/page.tsx:107`) doğrudan taşınabilir.

### 3. Kolon Tercih Servisi
- `useTablePreferences` hook’u: `visibility`, `order`, `widths`, `density` gibi state’leri saklar; localStorage erişimi tek noktada yapılır.
- Hem `tasks/all` hem `stocks/inventory` dosyalarındaki localStorage mantığı (örn. `apps/web/app/(dashboard)/stocks/inventory/page.tsx:397`) bu hook’a taşınır.
- Kolon paneli için `DataTableColumnPanel` bileşeni: drag & drop, görünürlük seçimleri, sıfırlama.

### 4. Grup ve Özet Satırları
- `groupBy` opsiyonu tanımlandığında çekirdek tablo alt alta önce grup satırı sonra satırları basar (Tasks sayfasındaki mantık `apps/web/app/(dashboard)/tasks/all/page.tsx:496` referans alınacak).
- Toplam satırları (örn. stok summary) için `renderSummary` prop’u eklenerek grid altına ekstra satırlar eklenebilir.

### 5. Theming ve Yoğunluk
- `DataTable` container’ı üzerinden `headerVariant` (default, muted) ve `density` (`comfortable`, `compact`) prop’ları.
- Varsayılan Tailwind sınıfları `data-[density=compact]:h-9` benzeri pattern ile çözülebilir; header font ve background standardı (ör. `bg-slate-50`, `text-slate-600`).

### 6. Ek Bileşenler
- `DataTableActions` (satır aksiyonlarını menü veya buton grubu olarak gösterir).
- `StatusBadge` ve `PriorityBadge` gibi ortak rozet bileşenleri tablo hücre render’larında kullanmak için `meta.display = 'status'` benzeri sugar eklenebilir.
- `useColumnSchema` util’i: Tablo şemalarını statik JSON/TS dosyasında tutup, sayfalarda sadece API verisini bağlamak.

## Yol Haritası

### Faz 0 – Hazırlık (1 hafta)
- `TableSkeleton`, `EmptyState`, `SearchBar` bileşenlerini tüm tablolarla hizala (mevcutta DataTable dışındaki sayfalarda manuel loader var).
- `StatusBadge` ve `PriorityBadge` (`apps/web/components/shared`) kullanımını tablo hücrelerinde standart hale getirin.
- `tableId` envanterini çıkarın (tablo başına benzersiz kimlik listesi).

### Faz 1 – Çekirdek DataTable v2 (1–1.5 hafta)
- `DataTable` bileşenini yeni prop’larla genişletin; geriye dönük uyumluluğu korumak için opsiyonel özellikler kullanın.
- `useDataTableState` ve `useTablePreferences` hook’larını oluşturup localStorage erişimini buraya taşıyın.
- `DataTableToolbar` ve `DataTableColumnPanel` bileşenlerini ekleyin.
- Storybook veya docs için örnekler hazırlayın (`tables/basic`, `tables/searchable`, `tables/advanced`).

### Faz 2 – Basit Tablo Migrasyonu (1 hafta)
- Roller (`apps/web/app/(dashboard)/roles/page.tsx:67`), HR Doküman Ayarları (`apps/web/app/(dashboard)/settings/hr/documents/page.tsx:130`), Teklifler (`apps/web/app/(dashboard)/quotations/page.tsx:20`) gibi tabloları DataTable v2’ye taşıyın.
- Bu migrasyon sırasında toolbar/search/density gibi özellikleri doğrulayın; eksik prop ihtiyaçlarını belirleyin.

### Faz 3 – Gelişmiş Tablo Migrasyonu (2+ hafta)
- `tasks/all` tablosunu modüler hale getirin: filtre konfigürasyonu, grup mantığı ve aksiyonları DataTable v2 modüllerine bağlayın.
- Stok envanteri için dinamik kolon tanımlarını `useColumnSchema` üzerinden DataTable’a aktarın; kolon paneli ve width yönetimini ortaklaştırın.
- Dosya gezgini gibi tablo + alternatif görünüm içeren sayfalarda DataTable’ı sadece liste görünümü için kullanın; grid görünümü ayrı bileşen olarak kalsın.
- İş malzemeleri ve takip sekmelerini (jobs tabs) DataTable v2 ile hizalayıp ortak filtre/aksiyon şablonlarını çıkarın.

## Migrasyon Matrisi
- `apps/web/app/(dashboard)/roles/page.tsx`: Kolon definisyonlarını yeni `ColumnDef` arayüzüne taşı, `tableId="roles"` ekle.
- `apps/web/app/(dashboard)/quotations/page.tsx`: Toolbar’a durum/müşteri filtrelerini `ColumnDef.meta.filter` üzerinden tanımla, aksiyonları `DataTableActions` ile yönet.
- `apps/web/app/(dashboard)/settings/hr/documents/page.tsx`: İki tabloyu da DataTable v2’ye geçir, modal aç/kapa aksiyonlarını `onRowAction` ile bağla.
- `apps/web/app/(dashboard)/users/[id]/page.tsx`: HR belgeleri tablosunu DataTable v2 kullanacak şekilde güncelle, kategori filtresi toolbar’a taşınsın.
- `apps/web/app/(dashboard)/tasks/all/page.tsx`: Filtre formu + kolon paneli + grouping kodlarını modüler hale getir, DataTable state hook’una taşı.
- `apps/web/app/(dashboard)/stocks/inventory/page.tsx`: Dinamik kolon metadata’sını `useColumnSchema` aracılığıyla DataTable’a aktar, localStorage logic’ini `useTablePreferences` ile değiştir.
- `apps/web/app/(dashboard)/files/explorer/page.tsx`: Liste görünümünde DataTable v2 kullan, grid görünümü ayrı kalır; proses/job filtreleri toolbar’a bağlanır.

## Teknik Notlar
- `tableId` için rota tabanlı bir şema önerilir (`tasks.all`, `stocks.inventory` gibi).
- LocalStorage erişimi SSR ortamında guard edilmelidir (zaten `typeof window` kontrolü mevcut; hook içinde merkezileştirin).
- Sıralama/filtre state’i server-side API çağrıları ile entegre edilecekse, hook genişletilip dışarı `onStateChange` tetiklenebilir.
- Access kontrolü gereken aksiyonlar (örn. HR doküman ayarları) için `condition` fonksiyonları DataTable actions API’si üzerinden devam edebilir.

## Test ve Dokümantasyon
- Yeni DataTable v2 bileşenleri için Storybook senaryoları veya docs sayfası oluşturun.
- Regression riskine karşı kritik sayfalarda (Görevler, Stoklar) Cypress/Playwright smoke testleri ekleyin.
- Standart kullanım rehberi (`docs/ui/table-guidelines.md`) hazırlayarak tasarım ekibi ile hizalanın (header, badge, row density kararları).

Bu plan uygulanarak, mevcut shadcn tabanlı tablo implementasyonları tek bir bileşen ailesi altında toplanacak; ekstra kütüphane almadan hedeflenen enterprise özelliklerinin tamamı desteklenebilir hale gelecektir.
