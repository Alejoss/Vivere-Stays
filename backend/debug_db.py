#!/usr/bin/env python
"""
Debug script to check database connection and table visibility
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vivere_stays.settings')
django.setup()

from django.db import connection

def check_database_connection():
    print("=== Database Connection Debug ===")
    
    # Check search path
    with connection.cursor() as cursor:
        cursor.execute("SHOW search_path;")
        search_path = cursor.fetchone()
        print(f"Search path: {search_path[0]}")
    
    # Check what tables Django can see
    print("\n=== Tables Django can see ===")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name, table_schema 
            FROM information_schema.tables 
            WHERE table_schema IN ('dynamic', 'booking', 'core', 'public')
            ORDER BY table_schema, table_name;
        """)
        tables = cursor.fetchall()
        for table in tables:
            print(f"Schema: {table[1]}, Table: {table[0]}")
    
    # Specifically check for our table
    print("\n=== Checking for dp_price_change_history ===")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name, table_schema 
            FROM information_schema.tables 
            WHERE table_schema = 'dynamic' AND table_name = 'dp_price_change_history';
        """)
        result = cursor.fetchone()
        if result:
            print(f"✅ Found table: {result[1]}.{result[0]}")
        else:
            print("❌ Table not found!")
    
    # Test direct query
    print("\n=== Testing direct query ===")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM dynamic.dp_price_change_history;")
            count = cursor.fetchone()[0]
            print(f"✅ Direct query works! Table has {count} records")
    except Exception as e:
        print(f"❌ Direct query failed: {e}")
    
    # Test Django ORM
    print("\n=== Testing Django ORM ===")
    try:
        from dynamic_pricing.models import DpPriceChangeHistory
        count = DpPriceChangeHistory.objects.count()
        print(f"✅ Django ORM works! Table has {count} records")
    except Exception as e:
        print(f"❌ Django ORM failed: {e}")

if __name__ == "__main__":
    check_database_connection()
