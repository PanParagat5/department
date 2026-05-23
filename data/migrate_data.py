import pandas as pd
import os
from supabase import create_client

# 1. Setup your Supabase connection
# You can find these in your Supabase Dashboard under Project Settings > API
URL = "YOUR_SUPABASE_URL"
KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY" 
supabase = create_client(URL, KEY)

# 2. Map files to Tables
# This tells the script which CSV file goes to which SQL table
file_mapping = {
    "HIND-IT_PRINTER INVENTORY.xlsx - INDEX.csv": "assets_printers",
    "HIND-IT_PRINTER INVENTORY.xlsx - 12A.csv": "cartridge_inventory",
    "Apollo Printer Inventory - New(Daily Calls).csv": "daily_logs"
    # Add other files here as needed
}

def migrate():
    data_folder = "./data" # Put all your CSVs here
    
    for filename, table in file_mapping.items():
        filepath = os.path.join(data_folder, filename)
        
        if os.path.exists(filepath):
            print(f"Uploading {filename} to {table}...")
            df = pd.read_csv(filepath)
            
            # Convert DataFrame to list of dictionaries
            data_to_upload = df.to_dict(orient="records")
            
            # Batch upload to Supabase
            response = supabase.table(table).insert(data_to_upload).execute()
            print(f"Successfully uploaded {len(data_to_upload)} rows to {table}.")
        else:
            print(f"File {filename} not found in /data folder.")

if __name__ == "__main__":
    migrate()