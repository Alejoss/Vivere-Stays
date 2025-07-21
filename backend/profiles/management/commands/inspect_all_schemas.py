from django.core.management.base import BaseCommand
from django.db import connections
from django.db import models
import re

class Command(BaseCommand):
    help = 'Inspect all schemas and generate Django models'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='generated_models.py',
            help='Output file name'
        )
        parser.add_argument(
            '--schema',
            type=str,
            help='Specific schema to inspect (apaleo, avirato, booking, dynamic, mrplan)'
        )
    
    def handle(self, *args, **options):
        output_file = options['output']
        specific_schema = options['schema']
        
        # Define schemas to inspect
        schemas = ['apaleo', 'avirato', 'booking', 'dynamic', 'mrplan']
        if specific_schema:
            schemas = [specific_schema]
        
        with connections['default'].cursor() as cursor:
            models_code = []
            models_code.append("# This is an auto-generated Django model module.")
            models_code.append("# Generated from all schemas in the database.")
            models_code.append("from django.db import models")
            models_code.append("")
            
            for schema in schemas:
                self.stdout.write(f"Processing schema: {schema}")
                
                # Get all tables in this schema
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """, [schema])
                
                tables = cursor.fetchall()
                
                for (table_name,) in tables:
                    self.stdout.write(f"  Processing table: {schema}.{table_name}")
                    
                    # Get table structure
                    cursor.execute("""
                        SELECT column_name, data_type, is_nullable, column_default, 
                               character_maximum_length, numeric_precision, numeric_scale
                        FROM information_schema.columns 
                        WHERE table_schema = %s AND table_name = %s
                        ORDER BY ordinal_position
                    """, [schema, table_name])
                    
                    columns = cursor.fetchall()
                    
                    # Get primary key
                    cursor.execute("""
                        SELECT column_name
                        FROM information_schema.key_column_usage
                        WHERE table_schema = %s AND table_name = %s 
                        AND constraint_name LIKE '%%_pkey'
                    """, [schema, table_name])
                    
                    pk_result = cursor.fetchone()
                    primary_key = pk_result[0] if pk_result else None
                    
                    # Generate model
                    model_code = self.generate_model(schema, table_name, columns, primary_key)
                    models_code.extend(model_code)
                    models_code.append("")
            
            # Write to file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(models_code))
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully generated models in {output_file}')
            )
    
    def generate_model(self, schema, table_name, columns, primary_key):
        """Generate Django model code for a table"""
        
        # Convert table name to model name
        model_name = ''.join(word.capitalize() for word in table_name.split('_'))
        
        code = []
        code.append(f"class {model_name}(models.Model):")
        
        for column in columns:
            column_name, data_type, is_nullable, column_default, max_length, precision, scale = column
            
            # Clean column name (remove dots and special characters)
            clean_column_name = column_name.replace('.', '_').replace('-', '_')
            
            # Convert PostgreSQL type to Django field
            field = self.get_django_field(data_type, is_nullable, max_length, precision, scale)
            
            # Handle primary key
            if column_name == primary_key:
                field = "models.AutoField(primary_key=True)"
            
            code.append(f"    {clean_column_name} = {field}")
        
        # Add Meta class
        code.append("")
        code.append("    class Meta:")
        code.append(f"        managed = False")
        code.append(f"        db_table = '{schema}.{table_name}'")
        
        return code
    
    def get_django_field(self, data_type, is_nullable, max_length, precision, scale):
        """Convert PostgreSQL data type to Django field"""
        
        nullable = "null=True" if is_nullable == "YES" else ""
        def field_with_args(field_type, *args):
            args = [str(a) for a in args if a is not None and a != ""]
            if nullable:
                args.append(nullable)
            if args:
                return f"models.{field_type}({', '.join(args)})"
            else:
                return f"models.{field_type}()"
        
        if data_type == 'character varying':
            return field_with_args('CharField', f"max_length={max_length}" if max_length else "max_length=255")
        elif data_type == 'character':
            return field_with_args('CharField', f"max_length={max_length}" if max_length else "max_length=1")
        elif data_type == 'text':
            return field_with_args('TextField')
        elif data_type == 'integer':
            return field_with_args('IntegerField')
        elif data_type == 'bigint':
            return field_with_args('BigIntegerField')
        elif data_type == 'smallint':
            return field_with_args('SmallIntegerField')
        elif data_type == 'numeric':
            if precision and scale:
                return field_with_args('DecimalField', f"max_digits={precision}", f"decimal_places={scale}")
            else:
                return field_with_args('DecimalField', "max_digits=10", "decimal_places=2")
        elif data_type == 'decimal':
            if precision and scale:
                return field_with_args('DecimalField', f"max_digits={precision}", f"decimal_places={scale}")
            else:
                return field_with_args('DecimalField', "max_digits=10", "decimal_places=2")
        elif data_type == 'real':
            return field_with_args('FloatField')
        elif data_type == 'double precision':
            return field_with_args('FloatField')
        elif data_type == 'boolean':
            return field_with_args('BooleanField')
        elif data_type == 'date':
            return field_with_args('DateField')
        elif data_type == 'timestamp without time zone':
            return field_with_args('DateTimeField')
        elif data_type == 'timestamp with time zone':
            return field_with_args('DateTimeField')
        elif data_type == 'time without time zone':
            return field_with_args('TimeField')
        elif data_type == 'time with time zone':
            return field_with_args('TimeField')
        elif data_type == 'json':
            return field_with_args('JSONField')
        elif data_type == 'jsonb':
            return field_with_args('JSONField')
        elif data_type == 'uuid':
            return field_with_args('UUIDField')
        elif data_type == 'bytea':
            return field_with_args('BinaryField')
        elif data_type == 'ARRAY':
            return field_with_args('TextField') + "  # ARRAY type converted to TextField"
        else:
            return field_with_args('TextField') + f"  # Unknown type: {data_type}" 