#!/usr/bin/env python3
"""
Quick Data Import Script for Apollo Inventory
Supports CSV imports from Excel exports
"""
import csv
import json
import sys
from pathlib import Path

def import_printers_from_csv(filepath):
    """Import printer data from CSV"""
    printers = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                printer = {
                    'department_name': row.get('Department', '').upper(),
                    'printer_model': row.get('Printer Model', 'HP LaserJet Pro'),
                    'serial_number': row.get('Serial', '').upper(),
                    'cartridge_id': 1  # Will be updated after cartridges are created
                }
                if printer['department_name']:
                    printers.append(printer)
        
        print(f"✓ Imported {len(printers)} printers from {filepath}")
        return printers
    except Exception as e:
        print(f"✗ Error reading {filepath}: {e}")
        return None

def import_cartridges_from_csv(filepath):
    """Import cartridge models from CSV"""
    cartridges = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                cartridge = {
                    'model_name': row.get('Model', '').upper(),
                    'current_stock': int(row.get('Stock', 0))
                }
                if cartridge['model_name']:
                    cartridges.append(cartridge)
        
        print(f"✓ Imported {len(cartridges)} cartridge models from {filepath}")
        return cartridges
    except Exception as e:
        print(f"✗ Error reading {filepath}: {e}")
        return None

def export_to_json(data, filename):
    """Export data to JSON for manual upload"""
    try:
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"✓ Exported to {filename}")
        return True
    except Exception as e:
        print(f"✗ Error exporting: {e}")
        return False

def main():
    print("🔧 Apollo Inventory - Quick Import Tool\n")
    
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        
        # Detect file type and import
        if 'cartridge' in filepath.lower():
            data = import_cartridges_from_csv(filepath)
        else:
            data = import_printers_from_csv(filepath)
        
        if data:
            json_file = Path(filepath).stem + '_converted.json'
            export_to_json(data, json_file)
            print(f"\n📋 Review {json_file} and upload via Supabase dashboard")
    else:
        print("Usage: python3 import_data.py <csv_file>")
        print("\nExamples:")
        print("  python3 import_data.py printers.csv")
        print("  python3 import_data.py cartridges.csv")

if __name__ == "__main__":
    main()
