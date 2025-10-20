# 📋 SATINAL ALMA SİSTEMİ - FRONTEND YAPI PLANI

**Tarih:** 19 Ekim 2025
**Hedef:** Satın alma sistemi için gerekli sayfalar ve bileşenler

---

## 🗂️ KLASÖR YAPISI

```
apps/web/
├── app/(dashboard)/
│   ├── procurement/              # 🆕 YENİ - Ana satın alma klasörü
│   │   ├── requests/             # Purchase Requests
│   │   │   ├── page.tsx         # Liste sayfası
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # Yeni talep oluştur
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # Detay/Görüntüle
│   │   │       └── edit/
│   │   │           └── page.tsx # Düzenle (sadece draft)
│   │   │
│   │   ├── receipts/             # Goods Receipts (Mal Kabul)
│   │   │   ├── page.tsx         # Liste sayfası
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # Yeni mal kabul
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Detay & Kalite Kontrol
│   │   │
│   │   └── layout.tsx            # Procurement ortak layout
│   │
│   ├── jobs/[id]/                # 🔄 MEVCUT - Genişletilecek
│   │   └── materials/            # 🆕 YENİ TAB
│   │       └── page.tsx          # İş malzeme yönetimi
│   │
│   ├── quotations/               # 🔄 MEVCUT - Güncellenecek
│   │   └── [id]/
│   │       └── page.tsx          # Job seçimi eklenecek
│   │
│   └── stocks/                   # 🔄 MEVCUT - Genişletilecek
│       └── page.tsx              # "Beklenen" tab eklenecek
│
└── components/
    └── features/
        ├── procurement/          # 🆕 YENİ
        │   ├── PurchaseRequestsList.tsx
        │   ├── PurchaseRequestForm.tsx
        │   ├── PurchaseRequestCard.tsx
        │   ├── PurchaseRequestItemsTable.tsx
        │   ├── GoodsReceiptsList.tsx
        │   ├── GoodsReceiptForm.tsx
        │   ├── QualityInspectionForm.tsx
        │   └── PendingOrdersTable.tsx
        │
        └── jobs/                  # 🔄 MEVCUT - Genişletilecek
            └── JobMaterialsTable.tsx  # 🆕 YENİ
```

---

## 📄 SAYFA DETAYLARI

### 1. PURCHASE REQUESTS (Satın Alma Talepleri)

#### 📋 `/procurement/requests` - Liste Sayfası
**Görünüm:** Tablo + Filtreler
**Özellikler:**
- Filtreleme: Status, Priority, Job, Quotation
- Sıralama: Tarih, Öncelik, Miktar
- Status Badge'leri (draft, pending_approval, approved, rejected)
- Hızlı aksiyon butonları (Detay, Düzenle, Sil)

**Kolonlar:**
| PR Number | Quotation | Job | Priority | Items | Total | Status | Actions |
|-----------|-----------|-----|----------|-------|-------|--------|---------|

**Bileşenler:**
```tsx
- PurchaseRequestsList (Ana liste)
- FilterBar (Status, Priority filtreleri)
- PRStatusBadge (Durum badge'i)
- PRActionButtons (Onaya gönder, Onayla, Reddet)
```

---

#### ➕ `/procurement/requests/new` - Yeni Talep Oluştur
**Layout:** Form (2 kolon)
**Sol Kolon:**
- Temel Bilgiler (Priority, Required Date)
- Quotation Seçimi (dropdown - opsiyonel)
- Job Seçimi (dropdown - opsiyonel)
- Notlar

**Sağ Kolon:**
- Items Ekleme (Product seçimi veya manuel)
  - Product Search/Select
  - Quantity & Unit
  - Estimated Price
  - Supplier Suggestion
- Items Listesi (düzenlenebilir tablo)

**Alt Kısım:**
- Tahmini Toplam
- Kaydet (draft) / Onaya Gönder butonları

**Bileşenler:**
```tsx
- PurchaseRequestForm (Ana form)
- ProductSearchSelect (Autocomplete ürün arama)
- PRItemsTable (Kalem listesi)
- PRItemForm (Tek kalem ekleme/düzenleme)
```

---

#### 👁️ `/procurement/requests/[id]` - Detay Görüntüle
**Layout:** 2 Kolon + Alt Kısım

**Sol Kolon (Geniş):**
- PR Bilgileri (Number, Status, Priority)
- Quotation & Job Linkleri (varsa)
- Items Tablosu (read-only)
  - Product Name, Code
  - Quantity, Unit
  - Stock Durumu (current stock)
  - Estimated Price
  - Ordered/Received miktarlar (ilerleme çubuğu)

**Sağ Kolon (Dar - 300px):**
- Durum Bilgileri
  - Talep Eden
  - Onaylayan (varsa)
  - Tarihler
- İlişkili PO'lar (listesi)
- Aksiyon Butonları:
  - Düzenle (sadece draft)
  - Onaya Gönder (draft)
  - Onayla (pending_approval + yetki)
  - Reddet (pending_approval + yetki)
  - Sil (draft)

**Alt Kısım:**
- Activity Timeline (durum değişiklikleri)

**Bileşenler:**
```tsx
- PurchaseRequestDetail (Ana detay)
- PRItemsTable (Read-only liste)
- PRStatusTimeline (Durum geçmişi)
- LinkedPurchaseOrders (İlişkili PO'lar)
```

---

### 2. GOODS RECEIPTS (Mal Kabul)

#### 📋 `/procurement/receipts` - Liste Sayfası
**Görünüm:** Tablo + Filtreler
**Özellikler:**
- Filtreleme: Status, Supplier, Date Range
- Tab'ler: Tümü / Kontrol Bekleyen / Onaylananlar
- Status Badge'leri (pending_inspection, approved, rejected)

**Kolonlar:**
| GR Number | PO | Supplier | Received Date | Lines | Accepted | Rejected | Status | Actions |
|-----------|----|----|---------------|-------|----------|----------|--------|---------|

**Özel Gösterim:**
- Accepted/Rejected miktarları renk kodlu
- Quality check ikonu (varsa)

**Bileşenler:**
```tsx
- GoodsReceiptsList (Ana liste)
- GRStatusBadge (Durum badge'i)
- GRFilterBar (Filtreler)
```

---

#### ➕ `/procurement/receipts/new` - Yeni Mal Kabul
**Adım 1: PO Seçimi**
- Pending Purchase Orders listesi (kart görünümü)
- Her kartta:
  - PO Code, Supplier
  - Expected Delivery Date
  - Items sayısı
  - Pending quantity
  - "Teslim Al" butonu

**Adım 2: Teslim Alma**
**Layout:** Form (Tek kolon - geniş)
- PO Bilgileri (read-only özet)
- Items Tablosu (düzenlenebilir):
  | Product | Ordered | Received | Accept | Reject | Notes |
  |---------|---------|----------|--------|--------|-------|
  - Received quantity girişi (varsayılan = ordered)
  - Accept/Reject miktarları (kalite kontrol için hazırlık)
  - Notlar
- Genel Notlar
- Kaydet butonu

**Bileşenler:**
```tsx
- PendingOrdersTable (PO seçim listesi)
- GoodsReceiptForm (Ana form)
- GRLineItemsTable (Kalem tablosu)
- QuantityInputGroup (Ordered/Received/Accept/Reject)
```

---

#### 🔍 `/procurement/receipts/[id]` - Kalite Kontrol & Detay
**Layout:** 2 Kolon

**Sol Kolon (Geniş):**
- GR Bilgileri (Number, Status, Date)
- PO & Supplier Bilgileri
- Items Tablosu:
  - **Pending Inspection durumunda:** Düzenlenebilir
    - Accept Quantity (input)
    - Reject Quantity (input)
    - Rejection Reason (textarea)
    - Status select (accepted/rejected/partial)
  - **Approved durumunda:** Read-only
    - Kabul/Red miktarları gösterim

**Sağ Kolon (Dar):**
- Durum Bilgileri
  - Teslim alan
  - Kalite kontrol yapan (varsa)
  - Tarihler
- Özet:
  - Toplam kabul edilen
  - Toplam reddedilen
  - Stok güncelleme durumu
- Aksiyon Butonları:
  - Kalite Kontrolü Tamamla (pending)
  - Onayla ve Stoğa Ekle (inspected)
  - Reddet (tümünü)

**Bileşenler:**
```tsx
- GoodsReceiptDetail (Ana detay)
- QualityInspectionForm (Kalite kontrol formu)
- GRLineItemsTable (Kalem tablosu)
- GRSummaryCard (Özet kartı)
```

---

### 3. JOB MATERIALS (İş Malzemeleri)

#### 📦 `/jobs/[id]/materials` - İş Malzeme Yönetimi
**Görünüm:** Tab olarak job detay sayfasına eklenecek

**Layout:** Tek sayfa (geniş)

**Üst Kısım:**
- Özet Kartlar (4 adet yan yana)
  - Toplam Malzeme Sayısı
  - Rezerve Edilen
  - Tüketilen
  - Tamamlanma Yüzdesi (progress bar)

**Ana Tablo:**
| Product | Required | Allocated | Consumed | Remaining | Stock | Status | Actions |
|---------|----------|-----------|----------|-----------|-------|--------|---------|

**Özellikler:**
- Status badge (pending, allocated, consumed)
- Stock durumu renk kodlu (yeşil: yeterli, kırmızı: yetersiz)
- Progress bar (consumed / required)
- Aksiyon butonları:
  - Malzeme Ekle
  - Düzenle
  - Sil (sadece consumed değilse)

**Sağ Üst:**
- "Stok Kontrolü Yap" butonu
- "Tümünü Rezerve Et" butonu
- "Tüketim Kaydet" butonu (modal açar)

**Modal'lar:**
1. **Malzeme Ekle:**
   - Product search/select
   - Required quantity
   - Unit
   - Notes

2. **Tüketim Kaydet:**
   - Malzeme seçimi (sadece allocated olanlar)
   - Consumed quantity
   - Toplu işlem (birden fazla malzeme)

**Bileşenler:**
```tsx
- JobMaterialsTable (Ana tablo)
- MaterialSummaryCards (Özet kartları)
- AddMaterialModal (Malzeme ekleme)
- ConsumeModal (Tüketim kaydetme)
- MaterialStatusBadge (Durum badge)
- StockAvailabilityIndicator (Stok göstergesi)
```

---

### 4. MEVCUT SAYFALARA EKLEMELER

#### 🔄 Quotations `/quotations/[id]`
**Eklenecek:**
- Job seçimi dropdown (yeni teklif oluştururken)
- Detay sayfasında job linki (varsa)

#### 🔄 Stocks `/stocks`
**Eklenecek:**
- Yeni Tab: "Beklenen Mallar"
  - Yoldaki PO'lardan gelen ürünler
  - Expected delivery date
  - Quantity
  - Supplier

**Bileşen:**
```tsx
- IncomingStocksTable (Beklenen mallar)
```

---

## 🎨 ORTAK BİLEŞENLER

### Layout & Navigation
```tsx
- ProcurementLayout.tsx
  - Sidebar menü: Requests, Receipts, (Stocks'a link)
  - Breadcrumb
  - Page header

- ProcurementNav.tsx
  - Tab navigation (Requests tabında: Tümü, Pending, Approved)
```

### Form Components
```tsx
- ProductSearchSelect.tsx      # Ürün arama autocomplete
- QuantityInput.tsx            # Miktar girişi (number + unit)
- StatusBadge.tsx              # Durum badge (renk kodlu)
- PriorityBadge.tsx            # Öncelik badge
- DateRangePicker.tsx          # Tarih aralığı seçici
```

### Table Components
```tsx
- DataTable.tsx                # Genel tablo (filtreleme, sıralama)
- ProgressBar.tsx              # İlerleme çubuğu
- ActionMenu.tsx               # Aksiyon dropdown menüsü
```

### Modal/Dialog Components
```tsx
- ConfirmDialog.tsx            # Onay dialogu
- RejectReasonModal.tsx        # Red nedeni girişi
- ItemFormModal.tsx            # Kalem ekleme/düzenleme
```

### Card Components
```tsx
- SummaryCard.tsx              # Özet kartı (istatistikler için)
- InfoCard.tsx                 # Bilgi kartı
- TimelineCard.tsx             # Durum geçmişi
```

---

## 🎯 ÖNCELİK SIRASI (Uygulama Adımları)

### AŞAMA 1: Temel Yapı (1-2 gün)
1. ✅ Klasör yapısını oluştur (`/procurement`)
2. ✅ Procurement Layout oluştur
3. ✅ Ortak bileşenler (StatusBadge, ProductSearch, DataTable)
4. ✅ API client fonksiyonları (`lib/api/procurement.ts`)

### AŞAMA 2: Purchase Requests (2-3 gün)
1. ✅ Liste sayfası
2. ✅ Yeni talep oluşturma
3. ✅ Detay sayfası
4. ✅ Onay/Red işlemleri

### AŞAMA 3: Goods Receipts (2-3 gün)
1. ✅ Liste sayfası
2. ✅ Yeni mal kabul
3. ✅ Kalite kontrol ekranı
4. ✅ Onay işlemi

### AŞAMA 4: Job Materials (1-2 gün)
1. ✅ Materials tab
2. ✅ Malzeme ekleme/düzenleme
3. ✅ Tüketim kaydetme

### AŞAMA 5: Entegrasyon (1 gün)
1. ✅ Quotation'a job seçimi
2. ✅ Stocks'a "Beklenen" tab
3. ✅ Testler

**Toplam Tahmini Süre:** 7-11 gün

---

## 📊 EKRAN GÖRSELLERİ (Wireframe)

### Purchase Requests Liste
```
┌─────────────────────────────────────────────────────────────┐
│ Satın Alma Talepleri                          [+ Yeni Talep]│
├─────────────────────────────────────────────────────────────┤
│ [🔍 Ara] [Status ▼] [Priority ▼] [Job ▼]                   │
├──────┬──────────┬─────┬──────┬──────┬────────┬────────┬────┤
│ PR#  │Quotation │ Job │Prior.│Items │ Total  │ Status │Act.│
├──────┼──────────┼─────┼──────┼──────┼────────┼────────┼────┤
│PR-001│ TKL-123  │ J-1 │ HIGH │  3   │4,550₺ │[Approved]│ ⋮ │
│PR-002│    -     │  -  │ MED  │  1   │1,200₺ │[Pending] │ ⋮ │
└──────┴──────────┴─────┴──────┴──────┴────────┴────────┴────┘
```

### Goods Receipt Kalite Kontrol
```
┌─────────────────────────────────────────────────────────────┐
│ Mal Kabul - GR-2025-00001              [Onayla] [Reddet]   │
├──────────────────────┬──────────────────────────────────────┤
│ PO: PO-TEST-001     │ Teslim Alan: Admin                   │
│ Supplier: ABC Ltd.  │ Teslim Tarihi: 19.10.2025            │
├─────────────────────┴──────────────────────────────────────┤
│ Kalemler                                                    │
├────────┬────────┬─────────┬────────┬────────┬─────────────┤
│Product │Ordered │Received │Accept  │Reject  │ Notes       │
├────────┼────────┼─────────┼────────┼────────┼─────────────┤
│Kağıt A4│ 100    │ 98      │[95]    │[3]     │[3 hasarlı]  │
│        │        │         │        │        │             │
└────────┴────────┴─────────┴────────┴────────┴─────────────┘
```

---

## 🔧 TEKNİK NOTLAR

### State Management
- Next.js App Router (Server Components + Client Components)
- Form state: `useState` (basit formlar) veya `react-hook-form` (kompleks)
- Global state: Context API (gerekirse)

### Data Fetching
- Server Components: Direct API fetch
- Client Components: `useEffect` + `fetch` veya `useSWR`
- Mutations: Form actions veya client-side fetch

### Styling
- Tailwind CSS (mevcut yapıya uygun)
- shadcn/ui components (Button, Card, Table, Dialog, etc.)

### Validation
- Zod schemas (form validation)
- API error handling (try-catch + toast notifications)

---

## 📝 API CLIENT ÖRNEK

```typescript
// lib/api/procurement.ts

export const procurementAPI = {
  // Purchase Requests
  getPurchaseRequests: (filters) =>
    fetch(`/api/purchase-requests?${params}`),

  createPurchaseRequest: (data) =>
    fetch('/api/purchase-requests', { method: 'POST', body: JSON.stringify(data) }),

  approvePurchaseRequest: (id) =>
    fetch(`/api/purchase-requests/${id}/approve`, { method: 'POST' }),

  // Goods Receipts
  getGoodsReceipts: () =>
    fetch('/api/goods-receipts'),

  createGoodsReceipt: (data) =>
    fetch('/api/goods-receipts', { method: 'POST', body: JSON.stringify(data) }),

  // Job Materials
  getJobMaterials: (jobId) =>
    fetch(`/api/jobs/${jobId}/materials`),

  consumeMaterials: (jobId, data) =>
    fetch(`/api/jobs/${jobId}/materials/consume`, { method: 'POST', body: JSON.stringify(data) })
};
```

---

**Hazırlayan:** Claude
**Tarih:** 19 Ekim 2025
**Durum:** Çerçeve Tasarım Tamamlandı ✅
