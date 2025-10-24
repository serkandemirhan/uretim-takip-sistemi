# Tablo Standardizasyon Analizi

## 📊 Mevcut Durum Özeti

Projede **15+ sayfa** incelendi. Tablo/liste kullanımları 6 farklı pattern ile implemente edilmiş.

### Tablo Kullanan Sayfalar (6 adet)

| Sayfa | Rota | Özellikler | Karmaşıklık |
|-------|------|-----------|-------------|
| **All Tasks** | `/tasks/all` | 17+ kolon, sütun bazlı filtreler, sıralama, reset butonu | ⭐⭐⭐⭐⭐ |
| **Roles** | `/roles` | 6 kolon, basit CRUD, loading state | ⭐⭐ |
| **Files Explorer** | `/files/explorer` | Liste/Grid toggle, hiyerarşik filtre, dosya icons | ⭐⭐⭐⭐ |
| **Quotations** | `/quotations` | Status/müşteri filtreleri, responsive (mobil card görünüm) | ⭐⭐⭐ |
| **Job Quotations** | `/jobs/[id]/quotations` | Status tabs, search, inline status değiştirme | ⭐⭐⭐⭐ |
| **Users** | `/users` | 6 kolon, avatar, role badges, inline edit | ⭐⭐⭐ |

### Liste/Card Kullanan Sayfalar (9+ adet)

| Sayfa | Rota | Görünüm | Özellikler |
|-------|------|---------|-----------|
| **Jobs** | `/jobs` | 3 mod (Compact/Process/Detailed) | En karmaşık: Stats cards, 6 filtre, pagination |
| **Customers** | `/customers` | HTML table + side panel | 8 kolon, multi-field search, sliding edit panel |
| **Processes** | `/processes` | Hierarchical tree | Drag-drop, expandable groups, mobile/desktop layout |
| **Machines** | `/machines` | Table | 6 kolon, inline edit, basit |
| **Stock Inventory** | `/stocks/inventory` | Advanced table | Kolon yönetimi, visibility, reorder, resize, localStorage |
| **Stock Movements** | `/stocks/movements` | Table | 10 kolon, movement type badges, financial info |
| **Purchase Requests** | `/procurement/requests` | Card list | Status filter, card layout |

---

## 🎯 Tespit Edilen Patternler

### 1. **Simple Table Pattern** (Basit)
**Kullanım:** Roles, Machines
- Standart shadcn Table component
- Action column (Edit/Delete)
- Özellik yok (sadece liste)

**Kod Örneği:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>#</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.id}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <Button onClick={() => edit(item)}>Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 2. **Filter-Heavy Pattern** (Filtre Ağırlıklı)
**Kullanım:** Tasks, Jobs, Quotations
- Çoklu filtre inputları
- Search bar
- Filter badge'leri (aktif filtre sayısı)
- Reset butonu

**Özellikler:**
- Status dropdown
- Date range picker
- Customer/user selector
- Search input (multi-field)
- Filter count badge

### 3. **Modal/Panel Pattern** (Form Tabanlı)
**Kullanım:** Customers, Stock Inventory
- Ana liste görünümü
- Yan panel veya modal form
- Multi-field CRUD forms

### 4. **Hierarchy Pattern** (Hiyerarşik)
**Kullanım:** Processes, Files
- Tree/nested yapı
- Expandable sections
- Grup bazlı organizasyon
- Drag-drop support

### 5. **Multi-View Pattern** (Çoklu Görünüm)
**Kullanım:** Tasks, Jobs, Files
- Toggle butonları (List/Grid/Card)
- Her mod için farklı component
- Responsive fallback

### 6. **Advanced Configuration Pattern** (Gelişmiş)
**Kullanım:** Stock Inventory
- Kolon yönetimi UI
- Visibility toggle
- Sıralama, resize
- localStorage persistence

---

## 🔍 Ortak İhtiyaçlar

### Tüm Tablolarda Ortak:
✅ **Search/Filter** - 12/15 sayfada var
✅ **Actions** (Edit/Delete/View) - Her sayfada
✅ **Loading State** - Çoğunlukla manuel
✅ **Empty State** - Tutarsız implementasyon
✅ **Responsive** - Bazı sayfalarda card fallback

### Yarıya Yakın Sayfalarda:
🔶 **Status Badges** - 8/15 sayfa
🔶 **Pagination** - Sadece Jobs sayfası
🔶 **Sorting** - Sadece All Tasks
🔶 **Column Visibility** - Sadece Stock Inventory

### Az Kullanılan:
❌ **Bulk Actions** - Hiçbir sayfada yok
❌ **Export** - Hiçbir sayfada yok
❌ **Inline Editing** - Sadece 3 sayfada
❌ **Drag-drop Reorder** - Sadece Processes

---

## 💡 Generic DataTable Component Önerisi

### Temel Özellikler (Must-Have)

```typescript
interface DataTableProps<T> {
  // Data
  data: T[]
  loading?: boolean

  // Columns
  columns: ColumnDef<T>[]

  // Selection
  enableSelection?: boolean
  onSelectionChange?: (selectedIds: string[]) => void

  // Actions
  actions?: Action<T>[]
  bulkActions?: BulkAction<T>[]

  // Filtering
  searchable?: boolean
  searchPlaceholder?: string
  filters?: Filter[]

  // Sorting
  sortable?: boolean
  defaultSort?: { column: string; direction: 'asc' | 'desc' }

  // Pagination
  pagination?: boolean
  pageSize?: number
  totalItems?: number

  // Customization
  emptyState?: React.ReactNode
  customRowRender?: (row: T) => React.ReactNode

  // Column Management
  columnManagement?: boolean
  persistColumns?: string // localStorage key
}
```

### Kolon Tanımı

```typescript
interface ColumnDef<T> {
  id: string
  header: string
  accessor: keyof T | ((row: T) => any)

  // Visibility
  visible?: boolean
  hideable?: boolean

  // Sorting
  sortable?: boolean
  sortFn?: (a: any, b: any) => number

  // Filtering
  filterable?: boolean
  filterType?: 'text' | 'select' | 'date' | 'number'
  filterOptions?: { label: string; value: any }[]

  // Rendering
  render?: (value: any, row: T) => React.ReactNode
  width?: number
  minWidth?: number

  // Styling
  className?: string
  headerClassName?: string
}
```

### Action Tanımı

```typescript
interface Action<T> {
  label: string
  icon?: React.ReactNode
  onClick: (row: T) => void
  variant?: 'default' | 'destructive' | 'outline'
  condition?: (row: T) => boolean // Göster/gizle
}

interface BulkAction<T> {
  label: string
  icon?: React.ReactNode
  onClick: (selectedRows: T[]) => void
  variant?: 'default' | 'destructive'
}
```

### Filter Tanımı

```typescript
interface Filter {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'dateRange' | 'multiSelect'
  options?: { label: string; value: any }[]
  defaultValue?: any
  onChange: (value: any) => void
}
```

---

## 📋 Avantajlar vs Dezavantajlar

### ✅ Generic Component Avantajları

1. **Tutarlılık** - Tüm tablolar aynı görünüm ve davranış
2. **Hız** - Yeni tablo eklemek 10 dakika
3. **Bakım** - Tek yerden tüm tabloları güncelleme
4. **Özellik Paylaşımı** - Bir tabloya eklenen özellik hepsine gelir
5. **Test Edilebilirlik** - Tek component test edilir
6. **TypeScript Support** - Generic types ile tip güvenliği
7. **Accessibility** - Tek seferlik ARIA implementasyonu

### ❌ Potansiyel Dezavantajlar

1. **Karmaşıklık** - Component kodu karmaşık olabilir
2. **Esneklik Kaybı** - Çok özel durumlar zor olabilir
3. **Bundle Size** - Kullanılmayan özellikler de yüklenir
4. **Migration Eforu** - 15+ sayfayı migrate etmek zaman alır
5. **Öğrenme Eğrisi** - Yeni geliştiriciler API'yi öğrenmeli

---

## 🎨 Önerilen Çözüm

### Yaklaşım 1: **Kademeli Migrasyon** (Önerilen)

**Adım 1: Core Component Oluştur**
- Temel DataTable component
- Basit özellikler (search, sort, pagination)
- 2-3 basit sayfa ile test et (Roles, Machines)

**Adım 2: Gelişmiş Özellikler**
- Column management
- Advanced filters
- Bulk actions
- 2-3 orta seviye sayfa (Quotations, Users)

**Adım 3: Özel Durumlar**
- Hierarchy support (Processes)
- Multi-view toggle (Jobs, Tasks)
- Advanced customization (Stock Inventory)

**Timeline:** 2-3 hafta

### Yaklaşım 2: **Hybrid Approach** (Güvenli)

- Generic component sadece **basit tablolar** için (6-7 sayfa)
- Karmaşık sayfalar özel kalır (Jobs, Processes, Stock Inventory)
- Orta seviye sayfalar kademeli migrate edilir

**Timeline:** 1-2 hafta

### Yaklaşım 3: **Tam Migrasyon** (En Kapsamlı)

- Tüm liste sayfaları generic component'e geçer
- Custom view modes için slot/render prop pattern
- Maksimum standardizasyon

**Timeline:** 3-4 hafta

---

## 🚀 Öncelikli Aksiyonlar

### Hemen Yapılabilecekler:

1. ✅ **Empty State Standardize Et**
   - Tüm tablolarda aynı empty state component
   - "Veri bulunamadı" + icon + action button

2. ✅ **Loading State Standardize Et**
   - Skeleton loader için ortak component
   - Tüm tablolarda aynı loading animasyonu

3. ✅ **Search Input Standardize Et**
   - Ortak SearchBar component
   - Debounce built-in
   - Clear button

4. ✅ **Filter Badges Ekle**
   - Aktif filtre sayısını göster
   - "Clear all" butonu
   - Tüm filtrelerde kullan

### Orta Vadede:

5. 🔶 **Generic DataTable v1 Yaz**
   - Basit özellikler (search, actions, loading)
   - Roles ve Machines sayfalarını migrate et

6. 🔶 **Column Management Component**
   - Visibility toggle
   - Reorder (drag-drop)
   - localStorage persistence
   - Stock Inventory'den extract et

7. 🔶 **Advanced Filters Component**
   - Multi-type filters (text, select, date, range)
   - Filter builder UI
   - All Tasks'tan extract et

### Uzun Vadede:

8. ❌ **Export Functionality**
   - CSV/Excel export
   - Filtered data export
   - Tüm tablolara ekle

9. ❌ **Bulk Actions**
   - Multi-select checkbox
   - Bulk delete, bulk update
   - Status change for multiple items

10. ❌ **Pagination Standardize**
    - Server-side pagination support
    - Page size selector
    - Tüm büyük listelere ekle

---

## 📊 Karar Matrisi

| Kriter | Yaklaşım 1 (Kademeli) | Yaklaşım 2 (Hybrid) | Yaklaşım 3 (Tam) |
|--------|----------------------|-------------------|-----------------|
| **Hız** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| **Risk** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Standardizasyon** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Bakım Kolaylığı** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Esneklik** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Timeline** | 2-3 hafta | 1-2 hafta | 3-4 hafta |

---

## 🎯 Tavsiye Edilen Strateji

### **Hybrid Approach (Yaklaşım 2)** + Hızlı Kazanımlar

**Neden?**
- ✅ En düşük risk
- ✅ Hızlı sonuç (1-2 hafta)
- ✅ Özel sayfalar etkilenmez
- ✅ Basit sayfalar standardize olur
- ✅ İlerleyen süreçte genişletilebilir

**Aksiyonlar:**

**Hafta 1:**
1. Empty State component yaz → Tüm sayfalara uygula (1 gün)
2. Loading State component yaz → Tüm sayfalara uygula (1 gün)
3. SearchBar component yaz → Uygun sayfalara uygula (1 gün)
4. Filter Badges component yaz → Filtreleri olan sayfalara ekle (1 gün)

**Hafta 2:**
5. Generic DataTable v1 component yaz (2 gün)
   - Basit özellikler: columns, actions, search, loading
6. Roles sayfasını migrate et (1 gün)
7. Machines sayfasını migrate et (1 gün)

**Sonuç:**
- 4-5 ortak component oluşturulur
- 2 sayfa generic component'e geçer
- Tüm sayfalar daha tutarlı olur
- İlerisi için solid foundation

---

## 📚 İlham Kaynakları

Benzer component library'ler:
- **TanStack Table (React Table v8)** - En popüler
- **Material UI DataGrid** - Feature-rich
- **AG Grid** - Enterprise level
- **Mantine DataTable** - Modern, basit

**Not:** Sıfırdan yazmak yerine TanStack Table üzerine wrapper yazılabilir.

---

## 🔗 İlgili Dökümanlar

Bu analiz sonucunda oluşturulacak:
- [ ] `DataTable.tsx` - Generic component
- [ ] `DataTable.types.ts` - Type definitions
- [ ] `DataTable.stories.tsx` - Storybook examples
- [ ] `DATATABLE_MIGRATION_GUIDE.md` - Migration rehberi

---

**Hazırlayan:** Claude Code
**Tarih:** 2025-10-24
**Durum:** Karar bekleniyor
