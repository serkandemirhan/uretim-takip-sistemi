"""
Database schema export script
Supabase'e import etmek için schema'yı SQL olarak export eder
"""
import psycopg2
import sys
import os

# Config import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
from config import Config

def export_schema():
    """Local database'den schema'yı export et"""

    conn = psycopg2.connect(
        host=Config.DATABASE_HOST,
        port=Config.DATABASE_PORT,
        database=Config.DATABASE_NAME,
        user=Config.DATABASE_USER,
        password=Config.DATABASE_PASSWORD
    )

    cursor = conn.cursor()

    # Tüm tabloların schema'sını al
    tables_query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """

    cursor.execute(tables_query)
    tables = cursor.fetchall()

    output = []
    output.append("-- ReklamPRO Database Schema")
    output.append("-- Generated for Supabase import\n")

    for (table_name,) in tables:
        # Her tablo için CREATE TABLE statement'ı al
        cursor.execute(f"""
            SELECT
                'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
                string_agg(
                    column_name || ' ' || data_type ||
                    CASE
                        WHEN character_maximum_length IS NOT NULL
                        THEN '(' || character_maximum_length || ')'
                        ELSE ''
                    END ||
                    CASE
                        WHEN is_nullable = 'NO' THEN ' NOT NULL'
                        ELSE ''
                    END ||
                    CASE
                        WHEN column_default IS NOT NULL
                        THEN ' DEFAULT ' || column_default
                        ELSE ''
                    END,
                    ', '
                ) || ');'
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            AND table_schema = 'public'
            GROUP BY table_name;
        """)

        result = cursor.fetchone()
        if result:
            output.append(f"\n-- Table: {table_name}")
            output.append(result[0])

    # Constraints ve indexes
    output.append("\n\n-- Indexes and Constraints")

    # Primary keys
    cursor.execute("""
        SELECT
            'ALTER TABLE ' || tc.table_name ||
            ' ADD CONSTRAINT ' || tc.constraint_name ||
            ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ') || ');'
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        GROUP BY tc.table_name, tc.constraint_name;
    """)

    for (pk,) in cursor.fetchall():
        output.append(pk)

    # Foreign keys
    cursor.execute("""
        SELECT
            'ALTER TABLE ' || tc.table_name ||
            ' ADD CONSTRAINT ' || tc.constraint_name ||
            ' FOREIGN KEY (' || kcu.column_name || ')' ||
            ' REFERENCES ' || ccu.table_name || ' (' || ccu.column_name || ')' ||
            CASE
                WHEN rc.delete_rule != 'NO ACTION'
                THEN ' ON DELETE ' || rc.delete_rule
                ELSE ''
            END || ';'
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    """)

    for (fk,) in cursor.fetchall():
        output.append(fk)

    cursor.close()
    conn.close()

    # SQL dosyasına yaz
    sql_content = '\n'.join(output)

    with open('supabase_schema.sql', 'w') as f:
        f.write(sql_content)

    print("✅ Schema exported to: supabase_schema.sql")
    print(f"📊 Tables exported: {len(tables)}")
    print("\nTables:")
    for (table_name,) in tables:
        print(f"  - {table_name}")

if __name__ == '__main__':
    export_schema()
