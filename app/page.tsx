"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { supabase } from "../lib/supabase";
import "./globals.css";

interface Cartridge { id: number; model_name: string; current_stock: number; }
interface Printer { value: number; label: string; serial: string; pModel: string; cModel: string; cId: number; stock: number; }
interface Tx { id: number; created_at: string; dept: string | null; model: string | null; action: string | null; qty: number; notes: string | null; }

export default function CommandCenter() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"DASH" | "ADMIN">("DASH");
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [catalog, setCatalog] = useState<Cartridge[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [selP, setSelP] = useState<Printer | null>(null);
  const [mode, setMode] = useState<"STOCK" | "REPAIR">("STOCK");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const [newStock, setNewStock] = useState(0);
  const [selC, setSelC] = useState<number | null>(null);
  const [nDept, setNDept] = useState("");
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
    if (!nDept || !nSerial || !nReq || !nPModel) return notify("All fields req.", "error");
    setLoading(true);
    try {
      await supabase.from("printers").insert([{ department_name: nDept.toUpperCase(), serial_number: nSerial.toUpperCase(), printer_model: nPModel.toUpperCase(), cartridge_id: nReq }]);
      setNDept(""); setNSerial(""); setNPModel(""); setNReq(null);
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

  if (!mounted) return null;
  const low = catalog.filter(c => c.current_stock <= 3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {toast && <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded shadow bg-white border-l-4 text-sm font-medium ${toast.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>{toast.msg}</div>}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h1 className="text-xl font-bold">Apollo Operations Control</h1><p className="text-xs text-slate-500">Hardware & Consumables Ledger</p></div>
        <div className="flex gap-4">
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium">↻ Sync</button>
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
              <h2 className="font-bold mb-4">Select Department</h2>
              <Select options={printers} value={selP} onChange={setSelP} placeholder="Search..." isClearable />
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
                <input type="text" value={nDept} onChange={e=>setNDept(e.target.value)} placeholder="Dept (e.g. ICU)" className="w-full p-2 border rounded text-sm" />
                <input type="text" value={nPModel} onChange={e=>setNPModel(e.target.value)} placeholder="Printer Model" className="w-full p-2 border rounded text-sm" />
                <input type="text" value={nSerial} onChange={e=>setNSerial(e.target.value)} placeholder="Serial Number" className="w-full p-2 border rounded text-sm" />
                <select className="w-full p-2 border rounded text-sm" onChange={e=>setNReq(Number(e.target.value))} value={nReq || ""}><option value="" disabled>Requires Cartridge...</option>{catalog.map(c => <option key={c.id} value={c.id}>{c.model_name}</option>)}</select>
                <button onClick={addDept} disabled={!nDept || !nPModel || !nSerial || !nReq} className="w-full bg-slate-800 text-white py-2 rounded text-sm">Register Printer</button>
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