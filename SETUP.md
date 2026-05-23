# Apollo Inventory System - Complete Setup Guide

## 🚀 Getting Started

### 1. **Database Setup**

Your Supabase database needs these tables:

#### Table: `cartridge_catalog`
```sql
CREATE TABLE cartridge_catalog (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL UNIQUE,
  current_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `printers`
```sql
CREATE TABLE printers (
  id BIGSERIAL PRIMARY KEY,
  department_name VARCHAR(255) NOT NULL,
  printer_model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  cartridge_id BIGINT NOT NULL REFERENCES cartridge_catalog(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `transactions`
```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  department_name VARCHAR(255),
  cartridge_model VARCHAR(255),
  action_type VARCHAR(50), -- 'ISSUED', 'RECEIVED', 'REPAIRED'
  quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Environment Setup**

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. **Populate Initial Data**

Run the seed script:

```bash
# Option A: Using Python
python3 data/seed_inventory.py

# Option B: Manually via Supabase Dashboard
# Go to SQL Editor and execute the cartridge_catalog INSERT statements
```

### 4. **Start the Application**

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

---

## 📊 Features Overview

### **DASH View (Live Operations)**
- **Search Department**: Searchable dropdown with 145+ departments
- **Select Printer**: Filter printers by selected department
- **Transaction History**: Auto-populated per-department cartridge usage
- **Stock Search**: Real-time search across all cartridge models with:
  - Current stock level
  - Units in use by department
  - Visual stock indicator (green/yellow/red)
- **Issue/Receive**: Track cartridge issues and receipts
- **Repair Log**: Log printer repairs with notes
- **Export**: Download transaction history as CSV

### **ADMIN View (Inventory Management)**
- **Master Stock**: View all cartridge models and current levels
- **Add Stock**: Increase inventory for any cartridge
- **Deploy Hardware**: Register new printers with department assignment
- **New Cartridge Model**: Add new cartridge types to catalog

---

## 🔍 Search & Filter Capabilities

### Department Search
- Type any part of department name (e.g., "OPD", "ICU", "FINANCE")
- Instantly filters printer list to matching departments

### Stock Search
- Real-time search across all cartridge models
- Shows current stock level with visual indicators
- Displays how many departments use each cartridge
- Progress bar indicates stock health

### Transaction Filter
- Automatically shows history for selected department
- Displays ISSUED (quantity out) and RECEIVED (quantity in)
- Shows transaction dates and notes

---

## 📋 Department List (145+ Locations)

All standard hospital departments are pre-configured:
- OPD-1, OPD-2, Dr. Hota OPD-2
- Emergency Reception
- X-Ray, EEG, USG, ECHO Room
- Biochemistry, Hematology, Microbiology
- ICU, HDU, C-Ward, D-Ward
- Operation Theatre, CATH LAB
- And 100+ more...

---

## ✅ Testing the System

### Test Data Flow:
1. **DASH → Select Department** (e.g., "OPD 1")
2. **Select a Printer** from filtered list
3. **Issue Cartridge** (select qty, click Issue)
4. **Check Transaction History** - Should appear immediately
5. **Check Stock Search** - Stock level should decrease
6. **ADMIN → Master Stock** - Verify updated levels

### Real-time Updates:
- Changes instantly reflect across all views
- Transaction ledger updates in real-time
- Stock levels update immediately after issue/receipt

---

## 🛠️ Troubleshooting

### "No printers found"
→ Run the seed script to populate initial data

### "Stock not updating"
→ Check Supabase permissions and RLS policies

### "Search not working"
→ Ensure DEPARTMENTS_LIST in page.tsx is loaded (145+ items)

### "Realtime updates not working"
→ Verify Supabase realtime is enabled for all tables

---

## 📱 Responsive Design

- **Desktop**: Full 7-column layout with all features
- **Tablet**: 2-column layout adapts gracefully
- **Mobile**: Single column with optimized touch targets

---

## 🔐 Security Notes

- Use `SUPABASE_SERVICE_ROLE_KEY` only on server
- Frontend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Enable RLS policies in Supabase for production
- Department names are pre-validated against DEPARTMENTS_LIST

---

## 📈 Next Steps

1. ✅ Set up Supabase database (tables created above)
2. ✅ Add environment variables to `.env.local`
3. ✅ Run seed script or populate manually
4. ✅ Test all features in DASH and ADMIN views
5. ✅ Export sample reports using Export CSV
6. ✅ Configure realtime subscriptions for live updates

---

**Your Apollo Inventory System is now fully functional with:**
- 145+ department support
- Full-text search across cartridges
- Real-time transaction tracking
- Stock level monitoring
- Department-wise history
- One-click exports
