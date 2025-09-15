#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append('/app')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vivere_stays.settings')
django.setup()

from django.db import connection

def check_table_schema():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name='dynamic_pricing_dproomrates' 
            ORDER BY ordinal_position
        """)
        
        print("Columns in dynamic_pricing_dproomrates table:")
        for row in cursor.fetchall():
            print(f"  {row[0]} - {row[1]} - nullable: {row[2]} - default: {row[3]}")

if __name__ == "__main__":
    check_table_schema()
