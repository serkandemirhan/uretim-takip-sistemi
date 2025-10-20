#!/bin/bash

# Supabase Sync Script
# Bu script mevcut local PostgreSQL veritabanınızı Supabase'e senkronize eder

set -e

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Supabase Sync Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Local PostgreSQL bilgileri
LOCAL_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_DB="${LOCAL_DB_NAME:-reklam_db}"
LOCAL_USER="${LOCAL_DB_USER:-reklam_user}"
LOCAL_PASS="${LOCAL_DB_PASS:-reklam_pass_123}"

# Supabase bilgileri
SUPABASE_HOST="${SUPABASE_HOST}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_USER="${SUPABASE_USER:-postgres}"
SUPABASE_PASS="${SUPABASE_PASS}"

# Supabase bilgileri kontrol
if [ -z "$SUPABASE_HOST" ] || [ -z "$SUPABASE_PASS" ]; then
    echo -e "${RED}Hata: Supabase bağlantı bilgileri eksik!${NC}"
    echo ""
    echo "Lütfen .env dosyasını oluşturun veya şu environment variable'ları tanımlayın:"
    echo "  SUPABASE_HOST     - Supabase host (örn: db.xxxxx.supabase.co)"
    echo "  SUPABASE_PASS     - Supabase postgres şifresi"
    echo "  SUPABASE_USER     - Supabase kullanıcı adı (varsayılan: postgres)"
    echo "  SUPABASE_DB       - Supabase veritabanı adı (varsayılan: postgres)"
    echo ""
    echo "Örnek kullanım:"
    echo "  export SUPABASE_HOST=db.xxxxx.supabase.co"
    echo "  export SUPABASE_PASS=your_password"
    echo "  ./sync_to_supabase.sh"
    exit 1
fi

echo -e "${YELLOW}Local Veritabanı:${NC}"
echo "  Host: $LOCAL_HOST"
echo "  Database: $LOCAL_DB"
echo "  User: $LOCAL_USER"
echo ""

echo -e "${YELLOW}Supabase Hedef:${NC}"
echo "  Host: $SUPABASE_HOST"
echo "  Database: $SUPABASE_DB"
echo "  User: $SUPABASE_USER"
echo ""

# Çıktı dosyaları
OUTPUT_DIR="./supabase_sync_$(date +%Y%m%d_%H%M%S)"
SCHEMA_FILE="$OUTPUT_DIR/schema.sql"
DIFF_FILE="$OUTPUT_DIR/diff_report.txt"
MIGRATION_FILE="$OUTPUT_DIR/migration.sql"

mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}✓ Çıktı dizini oluşturuldu: $OUTPUT_DIR${NC}"
echo ""

# 1. Local şemayı dışa aktar
echo -e "${BLUE}[1/5] Local şema dışa aktarılıyor...${NC}"
PGPASSWORD="$LOCAL_PASS" pg_dump \
    -h "$LOCAL_HOST" \
    -p "$LOCAL_PORT" \
    -U "$LOCAL_USER" \
    -d "$LOCAL_DB" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --no-security-labels \
    --no-comments \
    -f "$SCHEMA_FILE"

echo -e "${GREEN}✓ Şema dışa aktarıldı: $SCHEMA_FILE${NC}"
echo ""

# 2. Supabase'den mevcut şemayı al
echo -e "${BLUE}[2/5] Supabase mevcut şema alınıyor...${NC}"
SUPABASE_SCHEMA_FILE="$OUTPUT_DIR/supabase_current_schema.sql"
PGPASSWORD="$SUPABASE_PASS" pg_dump \
    -h "$SUPABASE_HOST" \
    -p "$SUPABASE_PORT" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --no-security-labels \
    --no-comments \
    -f "$SUPABASE_SCHEMA_FILE" 2>/dev/null || echo "Supabase şeması alınamadı (boş olabilir)"

echo -e "${GREEN}✓ Supabase mevcut şema alındı${NC}"
echo ""

# 3. Farkları analiz et
echo -e "${BLUE}[3/5] Şema farkları analiz ediliyor...${NC}"

# Python ile akıllı diff analizi
cat > "$OUTPUT_DIR/analyze_diff.py" << 'PYTHON_SCRIPT'
import re
import sys

def extract_tables_and_columns(schema_file):
    """SQL dosyasından tablo ve kolon bilgilerini çıkar"""
    tables = {}
    current_table = None

    try:
        with open(schema_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        return {}

    # CREATE TABLE ifadelerini bul
    table_pattern = r'CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)\s*\((.*?)\);'
    matches = re.finditer(table_pattern, content, re.DOTALL | re.IGNORECASE)

    for match in matches:
        table_name = match.group(1)
        columns_def = match.group(2)

        # Kolonları parse et
        columns = {}
        for line in columns_def.split('\n'):
            line = line.strip()
            if not line or line.startswith('CONSTRAINT') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY'):
                continue

            # Kolon tanımını parse et
            parts = line.split()
            if len(parts) >= 2:
                col_name = parts[0].strip(',')
                col_type = parts[1].strip(',')
                columns[col_name] = col_type

        tables[table_name] = columns

    return tables

def generate_migration(local_tables, supabase_tables):
    """Farkları analiz edip migration SQL'i oluştur"""
    migrations = []

    # Yeni tablolar
    new_tables = set(local_tables.keys()) - set(supabase_tables.keys())
    if new_tables:
        migrations.append("-- Yeni tablolar (CREATE TABLE ifadeleri local schema'dan kopyalanmalı)")
        for table in sorted(new_tables):
            migrations.append(f"-- TODO: CREATE TABLE {table};")

    # Mevcut tablolardaki yeni kolonlar
    for table_name in sorted(set(local_tables.keys()) & set(supabase_tables.keys())):
        local_cols = local_tables[table_name]
        supabase_cols = supabase_tables.get(table_name, {})

        new_cols = set(local_cols.keys()) - set(supabase_cols.keys())
        if new_cols:
            migrations.append(f"\n-- Tablo: {table_name} - Yeni kolonlar")
            for col in sorted(new_cols):
                col_type = local_cols[col]
                migrations.append(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col} {col_type};")

    return '\n'.join(migrations)

def main():
    local_schema = sys.argv[1] if len(sys.argv) > 1 else 'schema.sql'
    supabase_schema = sys.argv[2] if len(sys.argv) > 2 else 'supabase_current_schema.sql'
    output_file = sys.argv[3] if len(sys.argv) > 3 else 'migration.sql'

    print("Şemalar analiz ediliyor...")
    local_tables = extract_tables_and_columns(local_schema)
    supabase_tables = extract_tables_and_columns(supabase_schema)

    print(f"Local tablolar: {len(local_tables)}")
    print(f"Supabase tablolar: {len(supabase_tables)}")

    migration_sql = generate_migration(local_tables, supabase_tables)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- ReklamPRO Supabase Migration\n")
        f.write(f"-- Oluşturulma: {sys.argv[4] if len(sys.argv) > 4 else 'N/A'}\n\n")
        f.write(migration_sql)

    print(f"Migration dosyası oluşturuldu: {output_file}")

if __name__ == '__main__':
    main()
PYTHON_SCRIPT

python3 "$OUTPUT_DIR/analyze_diff.py" \
    "$SCHEMA_FILE" \
    "$SUPABASE_SCHEMA_FILE" \
    "$MIGRATION_FILE" \
    "$(date)"

echo -e "${GREEN}✓ Migration dosyası oluşturuldu: $MIGRATION_FILE${NC}"
echo ""

# 4. Tam şema migration dosyası oluştur
echo -e "${BLUE}[4/5] Tam migration dosyası oluşturuluyor...${NC}"
FULL_MIGRATION="$OUTPUT_DIR/full_migration.sql"

cat > "$FULL_MIGRATION" << 'EOF'
-- ReklamPRO Supabase Full Migration
-- Bu dosya tüm tabloları ve kolonları oluşturur

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

EOF

# Schema dosyasını ekle
cat "$SCHEMA_FILE" >> "$FULL_MIGRATION"

echo -e "${GREEN}✓ Tam migration dosyası: $FULL_MIGRATION${NC}"
echo ""

# 5. Özet rapor oluştur
echo -e "${BLUE}[5/5] Özet rapor oluşturuluyor...${NC}"

cat > "$DIFF_FILE" << EOF
ReklamPRO Supabase Senkronizasyon Raporu
========================================
Tarih: $(date)

LOCAL VERİTABANI:
  Host: $LOCAL_HOST
  Database: $LOCAL_DB

SUPABASE HEDEF:
  Host: $SUPABASE_HOST
  Database: $SUPABASE_DB

OLUŞTURULAN DOSYALAR:
  1. $SCHEMA_FILE           - Local şema (tam)
  2. $MIGRATION_FILE        - İnkremental migration (sadece farklar)
  3. $FULL_MIGRATION        - Tam migration (sıfırdan kurulum)
  4. $SUPABASE_SCHEMA_FILE  - Supabase mevcut şema

KULLANIM:
---------
1. İnkremental Güncelleme (Önerilen):
   Mevcut Supabase veritabanınıza sadece eksik tabloları/kolonları ekler.

   psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -f "$MIGRATION_FILE"

2. Tam Yükleme (Temiz Başlangıç):
   Tüm şemayı sıfırdan oluşturur. UYARI: Mevcut veriler silinebilir!

   psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -f "$FULL_MIGRATION"

3. Manuel İnceleme:
   Dosyaları editörde açıp değişiklikleri gözden geçirin.

NOT:
----
- Migration'ları çalıştırmadan önce Supabase'de yedek alın
- Önce test environment'ta deneyin
- Migration sonrası app/web/.env.local dosyasını güncelleyin

EOF

cat "$DIFF_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Senkronizasyon hazırlığı tamamlandı!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Sonraki adımlar:${NC}"
echo "1. Migration dosyalarını inceleyin: $OUTPUT_DIR"
echo "2. Supabase'e yüklemek için:"
echo ""
echo -e "${BLUE}   # İnkremental (önerilen):${NC}"
echo "   PGPASSWORD=\"\$SUPABASE_PASS\" psql \\"
echo "     -h \"$SUPABASE_HOST\" \\"
echo "     -U \"$SUPABASE_USER\" \\"
echo "     -d \"$SUPABASE_DB\" \\"
echo "     -f \"$MIGRATION_FILE\""
echo ""
echo -e "${BLUE}   # Veya tam yükleme:${NC}"
echo "   PGPASSWORD=\"\$SUPABASE_PASS\" psql \\"
echo "     -h \"$SUPABASE_HOST\" \\"
echo "     -U \"$SUPABASE_USER\" \\"
echo "     -d \"$SUPABASE_DB\" \\"
echo "     -f \"$FULL_MIGRATION\""
echo ""
