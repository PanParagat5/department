"""
Seed Supabase with printer and cartridge inventory data
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cartridge Models - Common in Indian hospitals
CARTRIDGE_MODELS = [
    {"model_name": "HP 12A", "current_stock": 15},
    {"model_name": "HP 35A", "current_stock": 12},
    {"model_name": "HP 05A", "current_stock": 10},
    {"model_name": "Canon NPG-28", "current_stock": 8},
    {"model_name": "Xerox 106R03623", "current_stock": 14},
    {"model_name": "Brother TN2310", "current_stock": 6},
    {"model_name": "Ricoh MPC3003", "current_stock": 5},
    {"model_name": "Konica C224", "current_stock": 7},
    {"model_name": "Sharp MX-235", "current_stock": 9},
    {"model_name": "Kyocera TK-8309", "current_stock": 11},
]

# Printer Deployments (mapped to departments)
DEPARTMENTS_LIST = [
    "NURSING OFFICER", "FRONT RECEPTION LOBBY", "AUDITOR ROOM (BUNKER)", 
    "EMERGENCY NURSING COUNTER", "BRONCHOSCOPE", "DR. SASMITA HOTA OPD-2",
    "FIRE & SAFETY", "C-WARD HELP DESK", "EMERGENCY RECEPTION", "TPA DESK",
    "NURSING SUPERVISOR ROOM 1ST FLOOR", "BIOCHEMISTRY", "EEG", "ROOM NO. 17",
    "TELE RADIOLOGY", "FINANCE", "X-RAY", "ECHO ROOM", "OPD 1", "HEMATOLOGY",
    "MRD FRONT", "DAILY YSIS", "HELP DESK F WARD", "HRD", "CATH LAB", "OT",
    "BLOOD BANK", "OPD 2", "MICROBIOLOGY", "BIOMEDICAL", "RADIOLOGY",
    "CITY CENTER", "KITCHEN", "ONCOLOGY", "NEURO OPD", "CRS",
    "PFT ROOM", "ONCOLOGY RECEPTION", "OPD -1 REPORT", "ENDOSCOPY",
    "ADMIN", "HDU SECOND FLOOR", "MAIN STORE", "OT STORE", "PURCHASE"
]

def seed_cartridges():
    """Insert cartridge models"""
    try:
        # Check if data already exists
        result = supabase.table("cartridge_catalog").select("*").execute()
        if result.data and len(result.data) > 0:
            print(f"✓ Cartridge catalog already has {len(result.data)} items")
            return
        
        # Insert cartridges
        response = supabase.table("cartridge_catalog").insert(CARTRIDGE_MODELS).execute()
        print(f"✓ Added {len(response.data)} cartridge models")
        return response.data
    except Exception as e:
        print(f"✗ Error seeding cartridges: {e}")
        return None

def seed_printers(cartridges):
    """Insert printer deployments"""
    if not cartridges:
        print("✗ No cartridges available for printers")
        return
    
    try:
        # Check if data already exists
        result = supabase.table("printers").select("*").execute()
        if result.data and len(result.data) > 0:
            print(f"✓ Printers already has {len(result.data)} items")
            return
        
        # Create printer records
        printers = []
        cartridge_cycle = 0
        
        for i, dept in enumerate(DEPARTMENTS_LIST):
            # Assign cartridges in rotation
            cartridge = cartridges[cartridge_cycle % len(cartridges)]
            cartridge_cycle += 1
            
            printer = {
                "department_name": dept,
                "printer_model": f"HP LaserJet Pro M404{'n' if i % 2 == 0 else ''}",
                "serial_number": f"HIND-IT-{1000 + i}",
                "cartridge_id": cartridge["id"]
            }
            printers.append(printer)
        
        response = supabase.table("printers").insert(printers).execute()
        print(f"✓ Added {len(response.data)} printer deployments")
    except Exception as e:
        print(f"✗ Error seeding printers: {e}")

def main():
    print("🔄 Seeding Apollo Inventory Database...\n")
    
    cartridges = seed_cartridges()
    if cartridges:
        seed_printers(cartridges)
    
    print("\n✅ Database seeding complete!")

if __name__ == "__main__":
    main()
