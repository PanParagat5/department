"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { supabase } from "../lib/supabase";
import "./globals.css";

interface Cartridge { id: number; model_name: string; current_stock: number; }
interface Printer { value: number; label: string; serial: string; pModel: string; cModel: string; cId: number; stock: number; }
interface Tx { id: number; created_at: string; dept: string | null; model: string | null; action: string | null; qty: number; notes: string | null; }

const DEPARTMENTS_LIST = [
  "NURSING OFFICER", "FRONT RECEPTION LOBBY", "AUDITOR ROOM (BUNKER)", "EMERGENCY NURSING COUNTER", "BRONCHOSCOPE", "DR. SASMITA HOTA OPD-2",
  "FIRE & SAFETY", "C-WARD HELP DESK", "EMERGENCY RECEPTION", "TPA DESK", "NURSING SUPERVISOR ROOM 1ST FLOOR", "Dr Hota OPD 2",
  "BIOCHEMISTRY", "EEG", "ROOM NO. 17", "TELE RADIOLOGY", "FINANCE", "X-RAY", "ECHO ROOM", "OPD 1", "HEMATOLOGY", "MRD FRONT",
  "DAILY YSIS", "HELP DESK F WARD", "HRD", "CATH LAB", "OT", "BLOOD BANK", "OPD 2", "MICROBIOLOGY", "DR. KALPANA DAS",
  "DR. SUJIT PAHARI", "BIOMEDICAL", "TPA - DESK", "DR. JIGNESH PANDYA", "HELP DESK F WARD SECOND", "HDU SECOND FLOOR",
  "RADIOLOGY", "CITY CENTER", "KITCHEN", "DR. AB BHATTACHARYA", "ONCOLOGY", "NEURO OPD", "CRS", "MEDICAL COLLEGE (NAIDU MAM)",
  "PFT ROOM", "ONCOLOGY RECEPTION", "OPD -1 REPORT", "DR. DEVENDRA SINGH", "DR. SITENDU PATEL", "DR. P.P. MISHRA",
  "SECOND FLOOR", "DR. PRANKUR PURI OPD 2", "ADMISSION OFFICE NURSING COLLEGE", "HEAP DESK FIRST FLOOR", "MICRO BIOLOGY",
  "PURCHASE", "NURSING COLLEGE ACCOUNTS", "DR. ABHISHEK KAUSHLEY", "OT STORE", "TMT ROOM", "DR. ASHISH JAISWAL",
  "IT", "MCH", "HDU NURSING", "OPD 1 DR. VIJAY KUMAR SRIWASH", "HEALP DESK E WARD", "MAIN STORE", "TREATMENT PLANNING",
  "DR. AKASH", "DR. AMUL", "BLOOD BANK", "ENDOSCOPY", "DIETRY", "F&B", "SANJAY SIR", "MRD BASEMENT", "MARKETING",
  "REDIOTHERAPY", "HEALTH CHECKUP DESK", "ROOM NO. 17", "DR. SUSHREE PARIDA", "DR. MANOJ KU. RAI OPD 1",
  "DR. SUNIL K KENDIA", "DR. GAURI S ASATI", "DR. ANIL GUPAT", "B.WORD SECOND FLOOR", "DIETICIAN", "BOOD BANK",
  "USG", "SAMPLE COLLECTION", "A WARD", "D WARD", "B WARD", "IP BILLING", "E&B", "OPD 1 DR. VIJAY KUMAR SRIWASH",
  "DR. JAYAVELU", "DR. MANOJ KU.", "DEVESH GOPAL SIR", "DR. AVINASH", "BOI MEDICAL", "DR. SANDHYA CANDEL",
  "URODYNAMIC", "ADMIN", "DR. SURYANSH NEMA", "DR. J. KANASKER", "OT NISHIT SIR.", "PHYSIOTHERAPY", "EEG (PORTABLE)",
  "MRD SEEMA", "NURSING COLLEGE RECEPTION", "Dr.Asati Sir (OPD 2)", "AUDIMETRY ROOM", "HISTOPATHOLOGY",
  "DR. D. K. DAS", "DR. LAJPAT AGRAWAL", "G WARD", "QUALITY"
].sort().map(d => ({ value: d, label: d }));

export default function CommandCenter() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"DASH" | "ADMIN">("DASH");
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [catalog, setCatalog] = useState<Cartridge[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [selP, setSelP] = useState<Printer | null>(null);
  const [selDeptDash, setSelDeptDash] = useState<{ value: string; label: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState<"STOCK" | "REPAIR">("STOCK");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const [newStock, setNewStock] = useState(0);
  const [selC, setSelC] = useState<number | null>(null);
  const [nDept, setNDept] = useState("");
  const [selDeptObj, setSelDeptObj] = useState<{ value: string; label: string } | null>(null);
  const [nSerial, setNSerial] = useState("");
  const [nPModel, setNPModel] = useState("");
  const [nReq, setNReq] = useState<number | null>(null);
  const [nModel, setNModel] = useState("");
  const [nInit, setNInit] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchData();
    const ch = supabase.channel("realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "cartridge_catalog" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "printers" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: cData } = await supabase.from("cartridge_catalog").select("*").order("id");
    if (cData) setCatalog(cData);

    const { data: pData } = await supabase.from("printers").select("*");
    if (pData && cData) {
      const opts = pData.map((p: any) => {
        const c = cData.find((x: any) => x.id === p.cartridge_id) || { model_name: "Unknown", current_stock: 0 };
        return { value: p.id, label: p.department_name, serial: p.serial_number, pModel: p.printer_model || "N/A", cModel: c.model_name, cId: p.cartridge_id, stock: c.current_stock };
      });
      setPrinters(opts);
      if (selP) setSelP(opts.find(o => o.value === selP.value) || null);
    }

    const d = new Date(); d.setDate(d.getDate() - 15);
    const { data: tData } = await supabase.from("transactions").select("id, created_at, department_name, cartridge_model, action_type, quantity, notes").gte("created_at", d.toISOString()).order("created_at", { ascending: false });
    if (tData) setTxs(tData.map((t:any) => ({ id: t.id, created_at: t.created_at, dept: t.department_name, model: t.cartridge_model, action: t.action_type, qty: t.quantity, notes: t.notes })));
    setLoading(false);
  }

  function notify(msg: string, type: "success" | "error") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  }

  async function doStock(act: "ISSUED" | "RECEIVED") {
    if (!selP) return notify("Select dept.", "error");
    if (qty <= 0) return notify("Qty >= 1", "error");
    if (act === "ISSUED" && selP.stock < qty) return notify("Low stock!", "error");
    setLoading(true);
    try {
      await supabase.from("transactions").insert([{ department_name: selP.label, cartridge_model: selP.cModel, action_type: act, quantity: qty, notes: notes || null }]);
      await supabase.from("cartridge_catalog").update({ current_stock: selP.stock + (act === "ISSUED" ? -qty : qty) }).eq("id", selP.cId);
      notify(`Success ${act}`, "success");
      setQty(1); setNotes("");
    } catch (e) { notify("Error", "error"); }
    setLoading(false);
  }

  async function doRepair() {
    if (!selP || !notes) return notify("Select dept and enter notes.", "error");
    setLoading(true);
    try {
      await supabase.from("transactions").insert([{ department_name: selP.label, cartridge_model: `PRINTER: ${selP.pModel}`, action_type: "REPAIRED", quantity: 0, notes }]);
      notify("Repair logged.", "success"); setNotes("");
    } catch (e) { notify("Error", "error"); }
    setLoading(false);
  }

  async function undoTx(t: Tx) {
    if (!confirm("Void record?")) return;
    setLoading(true);
    try {
      if (t.action === "ISSUED" || t.action === "RECEIVED") {
        const c = catalog.find(x => x.model_name === t.model);
        if (c) await supabase.from("cartridge_catalog").update({ current_stock: c.current_stock + (t.action === "ISSUED" ? t.qty : -t.qty) }).eq("id", c.id);
      }
      await supabase.from("transactions").delete().eq("id", t.id);
      notify("Voided.", "success");
    } catch (e) { notify("Error", "error"); }
    setLoading(false);
  }

  async function addStock() {
    if (!selC || newStock <= 0) return notify("Invalid stock.", "error");
    setLoading(true);
    try {
      const c = catalog.find(x => x.id === selC);
      if (c) await supabase.from("cartridge_catalog").update({ current_stock: c.current_stock + newStock }).eq("id", c.id);
      notify("Stock added.", "success"); setNewStock(0); setSelC(null);
    } catch (e) { notify("Error", "error"); }
    setLoading(false);
  }

  async function addDept() {
    if (!selDeptObj || !nSerial || !nReq || !nPModel) return notify("All fields req.", "error");
    setLoading(true);
    try {
      await supabase.from("printers").insert([{ department_name: selDeptObj.value.toUpperCase(), serial_number: nSerial.toUpperCase(), printer_model: nPModel.toUpperCase(), cartridge_id: nReq }]);
      setSelDeptObj(null); setNSerial(""); setNPModel(""); setNReq(null);
      notify("Hardware added.", "success");
    } catch (e) { notify("Error", "error"); }
    setLoading(false);
  }

  async function addModel() {
    if (!nModel) return notify("Model name req.", "error");
    setLoading(true);
    try {
      await supabase.from("cartridge_catalog").insert([{ model_name: nModel.toUpperCase(), current_stock: nInit }]);
      setNModel(""); setNInit(0); notify("Model added.", "success");
    } catch (e) { notify("Error", "error"); }
    setLoading(false);
  }

  async function dlExcel() {
    if (!txs.length) return notify("No data.", "error");
    const XLSX = await import("xlsx");
    const data = txs.map(t => ({ Date: new Date(t.created_at).toLocaleDateString(), Time: new Date(t.created_at).toLocaleTimeString(), Dept: t.dept, Action: t.action, Qty: t.qty, Item: t.model, Notes: t.notes || "" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Log");
    XLSX.writeFile(wb, `Apollo_Log.xlsx`); notify("Exported.", "success");
  }

  async function createSampleData() {
    setLoading(true);
    try {
      // Create sample cartridges
      const cartridges = [
        { model_name: "HP 12A", current_stock: 15 },
        { model_name: "HP 35A", current_stock: 12 },
        { model_name: "Canon NPG-28", current_stock: 8 },
      ];
      
      const { data: cartData } = await supabase.from("cartridge_catalog").insert(cartridges).select();
      
      if (cartData && cartData.length > 0) {
        // Create sample printers using the departments list
        const sampleDepts = ["OPD 1", "OPD 2", "BIOCHEMISTRY", "EMERGENCY RECEPTION", "X-RAY", "ECHO ROOM"];
        const printerInserts = sampleDepts.map((dept, idx) => ({
          department_name: dept,
          printer_model: `HP LaserJet Pro M404${idx % 2 === 0 ? 'n' : ''}`,
          serial_number: `HIND-IT-${1000 + idx}`,
          cartridge_id: cartData[idx % cartData.length].id
        }));
        
        await supabase.from("printers").insert(printerInserts);
        notify("Sample data created! Refresh to see printers.", "success");
        setTimeout(() => fetchData(), 1000);
      }
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        notify("Sample data already exists", "error");
      } else {
        notify("Error creating sample data", "error");
      }
    }
    setLoading(false);
  }

  if (!mounted) return null;
  const low = catalog.filter(c => c.current_stock <= 3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {toast && <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded shadow bg-white border-l-4 text-sm font-medium ${toast.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>{toast.msg}</div>}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h1 className="text-xl font-bold">Apollo Operations Control</h1><p className="text-xs text-slate-500">Hardware & Consumables Ledger</p></div>
        <div className="flex gap-4">
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium">↻ Sync</button>
          {printers.length === 0 && (
            <button onClick={createSampleData} disabled={loading} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium">+ Sample Data</button>
          )}
          <div className="flex bg-slate-100 p-1 rounded">
            <button onClick={() => setView("DASH")} className={`px-4 py-1.5 rounded text-sm ${view === "DASH" ? "bg-white shadow" : "text-slate-500"}`}>Live</button>
            <button onClick={() => setView("ADMIN")} className={`px-4 py-1.5 rounded text-sm ${view === "ADMIN" ? "bg-white shadow" : "text-slate-500"}`}>Admin</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {low.length > 0 && <div className="mb-6 bg-red-50 p-4 rounded text-sm text-red-800 font-medium">Critical Stock: {low.map(i => `${i.model_name} (${i.current_stock}) `)}</div>}

        {view === "DASH" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded shadow-sm border border-slate-200">
              <h2 className="font-bold mb-2">Search Department</h2>
              <Select options={DEPARTMENTS_LIST} value={selDeptDash} onChange={setSelDeptDash} placeholder="Search department..." isClearable />
              
              <h2 className="font-bold mb-4 mt-6">Select Printer by Department</h2>
              {selDeptDash && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  {printers.length === 0 ? (
                    <p>📋 No printers found. Add printers in ADMIN → Deploy Hardware</p>
                  ) : printers.filter(p => p.label.toUpperCase().trim() === selDeptDash.value.toUpperCase().trim()).length === 0 ? (
                    <p>📋 No printers assigned to {selDeptDash.label} yet. Showing all available printers.</p>
                  ) : (
                    <p>✓ Found {printers.filter(p => p.label.toUpperCase().trim() === selDeptDash.value.toUpperCase().trim()).length} printer(s) in {selDeptDash.label}</p>
                  )}
                </div>
              )}
              <Select options={selDeptDash ? printers.filter(p => p.label.toUpperCase().trim() === selDeptDash.value.toUpperCase().trim()).length > 0 ? printers.filter(p => p.label.toUpperCase().trim() === selDeptDash.value.toUpperCase().trim()) : printers : printers} value={selP} onChange={setSelP} placeholder={printers.length === 0 ? "No printers available - Add in ADMIN" : "Search..."} isClearable isDisabled={printers.length === 0} />
              
              {selP && (
                <div className="mt-4 bg-slate-50 p-4 rounded border">
                  <h3 className="font-bold text-sm mb-3">Department Transaction History</h3>
                  <div className="max-h-[200px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white border-b sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Cartridge</th>
                          <th className="p-2 text-center">Issued</th>
                          <th className="p-2 text-center">Returned</th>
                          <th className="p-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {txs.filter(t => t.dept === selP.label && (t.action === 'ISSUED' || t.action === 'RECEIVED')).map((t, idx) => (
                          <tr key={idx} className="hover:bg-white">
                            <td className="p-2 font-medium">{t.model}</td>
                            <td className="p-2 text-center text-red-600">{t.action === 'ISSUED' ? t.qty : '-'}</td>
                            <td className="p-2 text-center text-green-600">{t.action === 'RECEIVED' ? t.qty : '-'}</td>
                            <td className="p-2 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {txs.filter(t => t.dept === selP.label && (t.action === 'ISSUED' || t.action === 'RECEIVED')).length === 0 && (
                      <p className="text-xs text-slate-500 p-3">No transactions found</p>
                    )}
                  </div>
                </div>
              )}
              
              {selP && (
                <div className="mt-6">
                  <div className="bg-slate-50 p-4 rounded mb-4 grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-slate-500 text-xs">Printer</p><p className="font-bold">{selP.pModel}</p><p className="text-xs">SN: {selP.serial}</p></div>
                    <div><p className="text-slate-500 text-xs">Cartridge</p><p className="font-bold bg-white px-2 py-1 rounded inline-block border">{selP.cModel}</p><p className={`text-xs mt-1 font-bold ${selP.stock <= 3 ? 'text-red-600' : 'text-green-600'}`}>Stock: {selP.stock}</p></div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setMode("STOCK")} className={`flex-1 py-2 text-sm font-medium rounded ${mode === "STOCK" ? "bg-slate-800 text-white" : "bg-slate-100"}`}>Cartridge</button>
                    <button onClick={() => setMode("REPAIR")} className={`flex-1 py-2 text-sm font-medium rounded ${mode === "REPAIR" ? "bg-amber-100 text-amber-900" : "bg-slate-100"}`}>Repair</button>
                  </div>
                  {mode === "STOCK" && (
                    <div className="space-y-4">
                      <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full p-2 border rounded" />
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => doStock("ISSUED")} disabled={loading || selP.stock < qty} className="bg-slate-800 text-white py-2 rounded">Issue (-)</button>
                        <button onClick={() => doStock("RECEIVED")} disabled={loading} className="border border-slate-300 py-2 rounded">Receive (+)</button>
                      </div>
                    </div>
                  )}
                  {mode === "REPAIR" && (
                    <div className="space-y-4">
                      <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Repair notes..." className="w-full p-2 border border-amber-200 rounded" />
                      <button onClick={doRepair} disabled={loading || !notes} className="w-full bg-amber-500 text-white py-2 rounded">Log Repair</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-white rounded shadow-sm border border-slate-200 flex flex-col h-[650px]">
              <div className="flex justify-between items-center p-4 border-b bg-slate-50"><h2 className="font-bold text-sm">15-Day Ledger</h2><button onClick={dlExcel} className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded border border-green-200">Export CSV</button></div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm"><thead className="bg-white sticky top-0 border-b"><tr><th className="p-3">Time</th><th className="p-3">Details</th><th className="p-3">Qty</th><th className="p-3">Action</th><th className="p-3">Void</th></tr></thead><tbody className="divide-y">
                  {txs.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 text-xs">{new Date(t.created_at).toLocaleDateString()}<br/>{new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                      <td className="p-3"><p className="font-bold">{t.dept}</p><p className="text-xs text-slate-500">{t.model}</p>{t.notes && <p className="text-xs italic text-slate-400 mt-1">Note: {t.notes}</p>}</td>
                      <td className="p-3 font-bold">{t.qty > 0 ? t.qty : '-'}</td>
                      <td className="p-3"><span className={`text-xs px-2 py-1 rounded border ${t.action === 'ISSUED' ? 'bg-indigo-50 text-indigo-700' : t.action === 'RECEIVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{t.action}</span></td>
                      <td className="p-3"><button onClick={() => undoTx(t)} className="text-xs text-red-500">Void</button></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </div>

            <div className="lg:col-span-12 bg-white rounded shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold mb-4">Stock Search & Availability</h2>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search cartridge models..." className="w-full p-3 border rounded mb-4 text-sm" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {catalog.filter(c => c.model_name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => {
                  const inUse = printers.filter(p => p.cId === c.id).length;
                  const statusColor = c.current_stock <= 3 ? 'bg-red-50' : c.current_stock <= 7 ? 'bg-yellow-50' : 'bg-green-50';
                  const textColor = c.current_stock <= 3 ? 'text-red-700' : c.current_stock <= 7 ? 'text-yellow-700' : 'text-green-700';
                  return (
                    <div key={c.id} className={`${statusColor} p-4 rounded border`}>
                      <p className="font-bold text-sm">{c.model_name}</p>
                      <p className={`text-2xl font-bold ${textColor} mt-2`}>{c.current_stock}</p>
                      <p className="text-xs text-slate-500 mt-1">Units in Stock</p>
                      <p className="text-xs text-slate-600 mt-2">In Use: <span className="font-bold">{inUse}</span></p>
                      <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${c.current_stock <= 3 ? 'bg-red-600' : c.current_stock <= 7 ? 'bg-yellow-600' : 'bg-green-600'}`} style={{width: `${Math.min((c.current_stock / 20) * 100, 100)}%`}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {catalog.filter(c => c.model_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No cartridges found</p>
              )}
            </div>
          </div>
        )}

        {view === "ADMIN" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded border shadow-sm">
                <h2 className="font-bold mb-4">Master Stock</h2>
                <div className="max-h-[300px] overflow-y-auto space-y-2 mb-6">
                  {catalog.map(c => <div key={c.id} className="flex justify-between p-3 bg-slate-50 border rounded text-sm"><span className="font-bold">{c.model_name}</span><span className={`px-2 py-1 rounded font-bold ${c.current_stock <= 3 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>{c.current_stock}</span></div>)}
                </div>
                <div className="bg-slate-50 p-4 border rounded space-y-3">
                  <h3 className="font-bold text-sm">Add Stock</h3>
                  <select className="w-full p-2 border rounded text-sm" onChange={e => setSelC(Number(e.target.value))} value={selC || ""}><option value="" disabled>Select model...</option>{catalog.map(c => <option key={c.id} value={c.id}>{c.model_name}</option>)}</select>
                  <input type="number" value={newStock || ""} onChange={e => setNewStock(Number(e.target.value))} placeholder="Qty" className="w-full p-2 border rounded text-sm" />
                  <button onClick={addStock} disabled={!selC || newStock <= 0} className="w-full bg-slate-800 text-white py-2 rounded text-sm">Commit Stock</button>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded border shadow-sm space-y-3">
                <h2 className="font-bold mb-2">Deploy Hardware</h2>
                <Select options={DEPARTMENTS_LIST} value={selDeptObj} onChange={setSelDeptObj} placeholder="Search department..." isClearable />
                <input type="text" value={nPModel} onChange={e=>setNPModel(e.target.value)} placeholder="Printer Model" className="w-full p-2 border rounded text-sm" />
                <input type="text" value={nSerial} onChange={e=>setNSerial(e.target.value)} placeholder="Serial Number" className="w-full p-2 border rounded text-sm" />
                <select className="w-full p-2 border rounded text-sm" onChange={e=>setNReq(Number(e.target.value))} value={nReq || ""}><option value="" disabled>Requires Cartridge...</option>{catalog.map(c => <option key={c.id} value={c.id}>{c.model_name}</option>)}</select>
                <button onClick={addDept} disabled={!selDeptObj || !nPModel || !nSerial || !nReq} className="w-full bg-slate-800 text-white py-2 rounded text-sm">Register Printer</button>
              </div>
              <div className="bg-white p-6 rounded border shadow-sm space-y-3">
                <h2 className="font-bold mb-2">New Cartridge Model</h2>
                <input type="text" value={nModel} onChange={e=>setNModel(e.target.value)} placeholder="Model (e.g. 12A)" className="w-full p-2 border rounded text-sm" />
                <input type="number" value={nInit || ""} onChange={e=>setNInit(Number(e.target.value))} placeholder="Initial Stock" className="w-full p-2 border rounded text-sm" />
                <button onClick={addModel} disabled={!nModel} className="w-full bg-slate-800 text-white py-2 rounded text-sm">Add Catalog Entry</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}