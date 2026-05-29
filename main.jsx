import { useState, useEffect, useMemo, useCallback } from "react"
import * as db from "./supabase.js"

// ─── Constants ───
var MATERIALS = [
  { id: "paper", label: "Papir/karton", color: "#D4A843", icon: "\u{1F4E6}" },
  { id: "plastic", label: "Plasty", color: "#E8672C", icon: "\u{1F6CD}" },
  { id: "wood", label: "Drevo", color: "#8B6F47", icon: "\u{1FAB5}" },
  { id: "glass", label: "Sklo", color: "#5BA68A", icon: "\u{1FAD9}" },
  { id: "metal", label: "Kovy", color: "#7A8B99", icon: "\u{1F96B}" },
  { id: "other", label: "Ostatni", color: "#9B7DB8", icon: "\u{1F4CB}" },
]
var PACK_TYPES = [
  { id: "prodejni", label: "Prodejni" },
  { id: "skupinove", label: "Skupinove" },
  { id: "prepravni", label: "Prepravni" },
  { id: "prumyslove", label: "Prumyslove" },
]
var QUARTERS = ["Q1 (leden-brezen)", "Q2 (duben-cerven)", "Q3 (cervenec-zari)", "Q4 (rijen-prosinec)"]
var NOW = new Date()
var CUR_YEAR = NOW.getFullYear()
var CUR_Q = Math.floor(NOW.getMonth() / 3)

var uid = function() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
var fmtKg = function(v) {
  if (!v) return "0"
  if (v < 1) return v.toFixed(3)
  if (v < 100) return v.toFixed(2)
  return v.toFixed(1)
}
var matOf = function(id) { return MATERIALS.find(function(m) { return m.id === id }) || MATERIALS[5] }
var ptOf = function(id) { return PACK_TYPES.find(function(p) { return p.id === id }) || PACK_TYPES[2] }

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  var [view, setView] = useState("dashboard")
  var [suppliers, setSuppliers] = useState([])
  var [templates, setTemplates] = useState([])
  var [receipts, setReceipts] = useState([])
  var [toast, setToast] = useState(null)
  var [selYear, setSelYear] = useState(CUR_YEAR)
  var [selQ, setSelQ] = useState(CUR_Q)
  var [loading, setLoading] = useState(true)
  var [dbOk, setDbOk] = useState(false)

  var notify = function(msg) { setToast(msg); setTimeout(function() { setToast(null) }, 2200) }

  // Load all data on mount
  useEffect(function() {
    (async function() {
      try {
        var s = await db.loadSuppliers()
        var t = await db.loadTemplates()
        var r = await db.loadReceipts()
        setSuppliers(s)
        setTemplates(t)
        setReceipts(r)
        setDbOk(true)
      } catch (e) {
        console.error("DB load failed:", e)
      }
      setLoading(false)
    })()
  }, [])

  // ─── CRUD handlers ───
  var addSupplier = async function(s) {
    var saved = await db.saveSupplier({ name: s.name, country: s.country, note: s.note })
    if (saved) { setSuppliers(function(p) { return [].concat(p, [saved]) }); notify("Dodavatel pridan") }
  }
  var delSupplier = async function(id) {
    await db.deleteSupplier(id)
    setSuppliers(function(p) { return p.filter(function(x) { return x.id !== id }) })
  }
  var addTemplate = async function(t) {
    var saved = await db.saveTemplate({ name: t.name, supplier_id: t.supplierId, items: t.items })
    if (saved) {
      setTemplates(function(p) { return [].concat(p, [saved]) })
      notify("Sablona ulozena")
    }
  }
  var delTemplate = async function(id) {
    await db.deleteTemplate(id)
    setTemplates(function(p) { return p.filter(function(x) { return x.id !== id }) })
  }
  var addReceipt = async function(r) {
    var saved = await db.saveReceipt(r)
    if (saved) {
      setReceipts(function(p) { return [saved].concat(p) })
      notify("Prijem ulozen")
    }
  }
  var updReceipt = async function(updated) {
    await db.updateReceipt(updated)
    setReceipts(function(p) { return p.map(function(r) { return r.id === updated.id ? updated : r }) })
  }
  var delReceipt = async function(id) {
    await db.deleteReceipt(id)
    setReceipts(function(p) { return p.filter(function(r) { return r.id !== id }) })
    notify("Prijem smazan")
  }

  var filtered = useMemo(function() {
    return receipts.filter(function(r) {
      var d = new Date(r.date)
      return d.getFullYear() === selYear && Math.floor(d.getMonth() / 3) === selQ
    })
  }, [receipts, selYear, selQ])

  var agg = useMemo(function() {
    var d = {}
    MATERIALS.forEach(function(m) { d[m.id] = {}; PACK_TYPES.forEach(function(p) { d[m.id][p.id] = { w: 0, r: 0 } }) })
    var litter = 0
    filtered.forEach(function(rec) {
      (rec.items || []).forEach(function(it) {
        if (d[it.material] && d[it.material][it.packType]) {
          d[it.material][it.packType].w += it.totalWeight || 0
          if (it.reusable) d[it.material][it.packType].r += it.totalWeight || 0
          if (it.littering && it.material === "plastic") litter += it.totalWeight || 0
        }
      })
    })
    var total = 0
    Object.values(d).forEach(function(m) { Object.values(m).forEach(function(v) { total += v.w }) })
    return { d: d, litter: litter, total: total }
  }, [filtered])

  var navItems = [
    { id: "dashboard", icon: "\u{1F4CA}", label: "Prehled" },
    { id: "receipt", icon: "\u{1F4E6}", label: "Prijem" },
    { id: "suppliers", icon: "\u{1F3ED}", label: "Dodavatele" },
    { id: "templates", icon: "\u{1F4CB}", label: "Sablony" },
    { id: "report", icon: "\u{1F4C4}", label: "Vykaz" },
  ]

  var qSelect = (
    <div style={{ display: "flex", gap: 8 }}>
      <select value={selYear} onChange={function(e) { setSelYear(+e.target.value) }} style={S.sel}>
        {[CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map(function(y) { return <option key={y} value={y}>{y}</option> })}
      </select>
      <select value={selQ} onChange={function(e) { setSelQ(+e.target.value) }} style={S.sel}>
        {QUARTERS.map(function(q, i) { return <option key={i} value={i}>{q}</option> })}
      </select>
    </div>
  )

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p style={{ color: "#6B7280" }}>Nacitam data...</p>
    </div>
  )

  return (
    <div>
      <header style={S.header}>
        <div style={S.headerIn}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.logoBox}>{"\u267B\uFE0F"}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#15803D" }}>EKO-KOM Evidence</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>Vykaznictvi obalu</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
                  borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: dbOk ? "#ECFDF5" : "#FEF2F2", color: dbOk ? "#059669" : "#DC2626",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: dbOk ? "#10B981" : "#EF4444" }} />
                  {dbOk ? "Supabase OK" : "Offline"}
                </span>
              </div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {navItems.map(function(n) { return (
              <button key={n.id} onClick={function() { setView(n.id) }}
                style={{ ...S.navBtn, ...(view === n.id ? S.navAct : {}) }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
              </button>
            ) })}
          </nav>
        </div>
      </header>

      <main style={S.main}>
        {view === "dashboard" && <Dashboard f={filtered} agg={agg} qSelect={qSelect}
          onUpdateReceipt={updReceipt} onDeleteReceipt={delReceipt} />}
        {view === "receipt" && <ReceiptView suppliers={suppliers} templates={templates} onSave={addReceipt} />}
        {view === "suppliers" && <SuppliersView data={suppliers} onAdd={addSupplier} onDel={delSupplier} />}
        {view === "templates" && <TemplatesView data={templates} suppliers={suppliers} onAdd={addTemplate} onDel={delTemplate} />}
        {view === "report" && <ReportView agg={agg} f={filtered} selYear={selYear} selQ={selQ} qSelect={qSelect} />}
      </main>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )
}

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
function Dashboard({ f, agg, qSelect, onUpdateReceipt, onDeleteReceipt }) {
  var [expandedId, setExpandedId] = useState(null)
  var matTotals = MATERIALS.map(function(m) {
    var t = 0; Object.values(agg.d[m.id]).forEach(function(v) { t += v.w }); return { id: m.id, label: m.label, color: m.color, t: t }
  }).filter(function(m) { return m.t > 0 })
  var sorted = [].concat(f).sort(function(a, b) { return new Date(b.date) - new Date(a.date) })

  var updateItemQty = function(receiptId, itemId, newQty) {
    var rec = f.find(function(r) { return r.id === receiptId })
    if (!rec) return
    onUpdateReceipt({
      id: rec.id, date: rec.date, supplierId: rec.supplierId, supplierName: rec.supplierName, note: rec.note,
      items: rec.items.map(function(it) {
        if (it.id !== itemId) return it
        var q = Math.max(1, newQty)
        return { id: it.id, name: it.name, material: it.material, packType: it.packType,
          unitWeight: it.unitWeight, quantity: q, totalWeight: Math.round(it.unitWeight * q * 1000) / 1000,
          reusable: it.reusable, littering: it.littering }
      }),
    })
  }
  var deleteItem = function(receiptId, itemId) {
    var rec = f.find(function(r) { return r.id === receiptId })
    if (!rec) return
    var ni = rec.items.filter(function(it) { return it.id !== itemId })
    if (ni.length === 0) { onDeleteReceipt(receiptId); setExpandedId(null) }
    else onUpdateReceipt({ id: rec.id, date: rec.date, supplierId: rec.supplierId, supplierName: rec.supplierName, note: rec.note, items: ni })
  }

  return (
    <div>
      <div style={S.secHead}><h2 style={S.secTitle}>Prehled ctvrtleti</h2>{qSelect}</div>
      <div style={S.kpiRow}>
        {[
          { l: "Celkova hmotnost", v: fmtKg(agg.total), u: "kg obalu" },
          { l: "Pocet prijmu", v: f.length, u: "za ctvrtleti" },
          { l: "Littering", v: fmtKg(agg.litter), u: "kg jednorazovych plastu" },
          { l: "Materialu", v: matTotals.length, u: "typu evidovano" },
        ].map(function(k, i) { return (
          <div key={i} style={S.kpi}><span style={S.kpiL}>{k.l}</span><span style={S.kpiV}>{k.v}</span><span style={S.kpiU}>{k.u}</span></div>
        ) })}
      </div>
      {matTotals.length > 0 && (
        <div style={S.card}>
          <h3 style={S.cardT}>Rozlozeni podle materialu</h3>
          {matTotals.map(function(m) { return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 100, fontSize: 13, color: "#4B5563" }}>{m.label}</span>
              <div style={{ flex: 1, height: 26, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: Math.max((m.t / agg.total) * 100, 3) + "%", background: m.color, borderRadius: 6 }} />
              </div>
              <span style={{ width: 85, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmtKg(m.t)} kg</span>
            </div>
          ) })}
        </div>
      )}
      <div style={S.card}>
        <h3 style={S.cardT}>Prijmy ({sorted.length})</h3>
        {sorted.length === 0 ? <p style={S.empty}>Zatim zadne prijmy.</p> : sorted.map(function(rec) {
          var isOpen = expandedId === rec.id
          var recTotal = rec.items.reduce(function(s, i) { return s + (i.totalWeight || 0) }, 0)
          return (
            <div key={rec.id} style={{ marginBottom: 6 }}>
              <div onClick={function() { setExpandedId(isOpen ? null : rec.id) }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: isOpen ? "#F0FDF4" : "#FAFBFC", borderRadius: isOpen ? "8px 8px 0 0" : 8,
                  border: isOpen ? "1px solid #BBF7D0" : "1px solid #F3F4F6",
                  borderBottom: isOpen ? "none" : undefined, cursor: "pointer", fontSize: 14 }}>
                <span style={{ fontSize: 12, color: isOpen ? "#15803D" : "#9CA3AF", fontWeight: 700, width: 20 }}>{isOpen ? "\u25BC" : "\u25B6"}</span>
                <span style={{ fontSize: 13, color: "#6B7280", width: 80 }}>{new Date(rec.date).toLocaleDateString("cs-CZ")}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{rec.supplierName}</span>
                <span style={{ fontSize: 13, color: "#9CA3AF", width: 55 }}>{rec.items.length} pol.</span>
                <span style={{ fontWeight: 700, width: 80, textAlign: "right" }}>{fmtKg(recTotal)} kg</span>
                <button onClick={function(e) { e.stopPropagation(); if (confirm("Smazat cely prijem?")) { onDeleteReceipt(rec.id); setExpandedId(null) } }}
                  style={{ ...S.delBtn, fontSize: 12, opacity: 0.6 }}>x</button>
              </div>
              {isOpen && (
                <div style={{ border: "1px solid #BBF7D0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "10px 12px", background: "#FAFFFE" }}>
                  {rec.items.map(function(it) { return (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px",
                      background: "#FFF", borderRadius: 6, marginBottom: 4, border: "1px solid #E5E7EB", fontSize: 13, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15 }}>{matOf(it.material).icon}</span>
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>
                          {matOf(it.material).label} / {ptOf(it.packType).label}
                          {it.reusable ? " / opak." : ""}{it.littering ? " / litter" : ""}
                          {" | " + it.unitWeight + " kg/ks"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button onClick={function() { updateItemQty(rec.id, it.id, it.quantity - 1) }} style={S.qBtn}>-</button>
                        <input type="number" value={it.quantity} min={1}
                          onChange={function(e) { updateItemQty(rec.id, it.id, Math.max(1, parseInt(e.target.value) || 1)) }} style={S.qInp} />
                        <button onClick={function() { updateItemQty(rec.id, it.id, it.quantity + 1) }} style={S.qBtn}>+</button>
                        <span style={{ width: 65, textAlign: "right", fontWeight: 700, fontSize: 13 }}>{fmtKg(it.totalWeight)} kg</span>
                        <button onClick={function() { deleteItem(rec.id, it.id) }} style={{ ...S.delBtn, fontSize: 12 }}>x</button>
                      </div>
                    </div>
                  ) })}
                  <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#15803D", marginTop: 6, paddingTop: 6, borderTop: "1px solid #E5E7EB" }}>
                    Celkem: {fmtKg(recTotal)} kg</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// ITEM EDITOR (shared)
// ═══════════════════════════════════════
function ItemEditor({ items, setItems, addLabel }) {
  var [showForm, setShowForm] = useState(false)
  var [name, setName] = useState("")
  var [material, setMaterial] = useState("paper")
  var [packType, setPackType] = useState("prepravni")
  var [uw, setUw] = useState("")
  var [qty, setQty] = useState(1)
  var [reusable, setReusable] = useState(false)
  var [littering, setLittering] = useState(false)
  var reset = function() { setName(""); setUw(""); setQty(1); setReusable(false); setLittering(false); setMaterial("paper"); setPackType("prepravni") }

  var add = function() {
    if (!name.trim() || !uw) return
    var u = parseFloat(uw); if (isNaN(u) || u <= 0) return
    setItems(function(prev) { return [].concat(prev, [{ id: uid(), name: name.trim(), material: material, packType: packType,
      unitWeight: u, quantity: qty, totalWeight: Math.round(u * qty * 1000) / 1000, reusable: reusable, littering: littering }]) })
    reset(); setShowForm(false)
  }
  var updQty = function(id, q) {
    setItems(function(prev) { return prev.map(function(it) {
      return it.id === id ? { ...it, quantity: q, totalWeight: Math.round(it.unitWeight * q * 1000) / 1000 } : it
    }) })
  }

  return (
    <div>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {items.map(function(it) { return (
            <div key={it.id} style={S.row}>
              <span style={{ fontSize: 16 }}>{matOf(it.material).icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>
                  {matOf(it.material).label} / {ptOf(it.packType).label}
                  {it.reusable ? " / opak." : ""}{it.littering ? " / litter" : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <button onClick={function() { updQty(it.id, Math.max(1, it.quantity - 1)) }} style={S.qBtn}>-</button>
                <input type="number" value={it.quantity} min={1}
                  onChange={function(e) { updQty(it.id, Math.max(1, +e.target.value || 1)) }} style={S.qInp} />
                <button onClick={function() { updQty(it.id, it.quantity + 1) }} style={S.qBtn}>+</button>
                <span style={{ width: 70, textAlign: "right", fontWeight: 700, fontSize: 13 }}>{fmtKg(it.totalWeight)} kg</span>
                <button onClick={function() { setItems(function(p) { return p.filter(function(x) { return x.id !== it.id }) }) }} style={S.delBtn}>x</button>
              </div>
            </div>
          ) })}
        </div>
      )}
      {showForm ? (
        <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 14, border: "1px solid #E5E7EB", marginBottom: 8 }}>
          <div style={S.grid3}>
            <Field l="Nazev"><input value={name} onChange={function(e) { setName(e.target.value) }} placeholder="Karton 40x30" style={S.inp} /></Field>
            <Field l="Material"><select value={material} onChange={function(e) { setMaterial(e.target.value) }} style={S.inp}>
              {MATERIALS.map(function(m) { return <option key={m.id} value={m.id}>{m.label}</option> })}</select></Field>
            <Field l="Typ obalu"><select value={packType} onChange={function(e) { setPackType(e.target.value) }} style={S.inp}>
              {PACK_TYPES.map(function(p) { return <option key={p.id} value={p.id}>{p.label}</option> })}</select></Field>
          </div>
          <div style={S.grid3}>
            <Field l="Hmotnost 1 ks (kg)"><input type="number" step="0.001" value={uw} onChange={function(e) { setUw(e.target.value) }} placeholder="0.350" style={S.inp} /></Field>
            <Field l="Pocet ks"><input type="number" min={1} value={qty} onChange={function(e) { setQty(Math.max(1, +e.target.value || 1)) }} style={S.inp} /></Field>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, paddingBottom: 2 }}>
              <label style={S.chk}><input type="checkbox" checked={reusable} onChange={function(e) { setReusable(e.target.checked) }} /> Opak. pouzitelny</label>
              {material === "plastic" && <label style={S.chk}><input type="checkbox" checked={littering} onChange={function(e) { setLittering(e.target.checked) }} /> Littering</label>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={add} style={S.btn1}>Pridat</button>
            <button onClick={function() { setShowForm(false); reset() }} style={S.btn2}>Zrusit</button>
          </div>
        </div>
      ) : (
        <button onClick={function() { setShowForm(true) }} style={S.btn2}>+ {addLabel || "Pridat polozku"}</button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// RECEIPT
// ═══════════════════════════════════════
function ReceiptView({ suppliers, templates, onSave }) {
  var [supId, setSupId] = useState("")
  var [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  var [note, setNote] = useState("")
  var [items, setItems] = useState([])
  var stpls = supId ? templates.filter(function(t) { return (t.supplier_id || t.supplierId) === supId || (t.supplier_id || t.supplierId) === "__global__" }) : []

  var addFromTpl = function(tpl) {
    var ni = (tpl.items || []).map(function(it) {
      return { id: uid(), name: it.name, material: it.material, packType: it.packType,
        unitWeight: it.unitWeight, quantity: it.quantity || 1,
        totalWeight: Math.round(it.unitWeight * (it.quantity || 1) * 1000) / 1000,
        reusable: !!it.reusable, littering: !!it.littering }
    })
    setItems(function(prev) { return [].concat(prev, ni) })
  }
  var save = function() {
    if (!items.length) return
    var sup = suppliers.find(function(s) { return s.id === supId })
    onSave({ id: uid(), date: date, supplierId: supId, supplierName: sup ? sup.name : "Neuvedeno", note: note, items: items })
    setItems([]); setNote("")
  }
  var totalW = items.reduce(function(s, i) { return s + (i.totalWeight || 0) }, 0)

  return (
    <div>
      <h2 style={S.secTitle}>Novy prijem</h2>
      <div style={S.card}>
        <div style={S.grid3}>
          <Field l="Datum"><input type="date" value={date} onChange={function(e) { setDate(e.target.value) }} style={S.inp} /></Field>
          <Field l="Dodavatel"><select value={supId} onChange={function(e) { setSupId(e.target.value) }} style={S.inp}>
            <option value="">-- vyberte --</option>
            {suppliers.map(function(s) { return <option key={s.id} value={s.id}>{s.name}</option> })}</select></Field>
          <Field l="Poznamka"><input value={note} onChange={function(e) { setNote(e.target.value) }} placeholder="c. dodaciho listu" style={S.inp} /></Field>
        </div>
      </div>
      <div style={S.card}>
        <h3 style={S.cardT}>Ze sablon</h3>
        {stpls.length === 0 ? (
          <p style={S.empty}>{supId ? "Pro tohoto dodavatele nejsou sablony." : "Nejdrive vyberte dodavatele."}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8, marginBottom: 12 }}>
            {stpls.map(function(tpl) {
              var ic = (tpl.items || []).length
              var tw = (tpl.items || []).reduce(function(s, i) { return s + i.unitWeight * (i.quantity || 1) }, 0)
              return (
                <button key={tpl.id} onClick={function() { addFromTpl(tpl) }} style={S.tplBtn}>
                  <span style={{ fontSize: 22 }}>{"\u{1F4E6}"}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, textAlign: "center", lineHeight: 1.3 }}>{tpl.name}</span>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>{ic} pol. / {fmtKg(tw)} kg</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div style={S.card}>
        <h3 style={S.cardT}>Polozky ({items.length})</h3>
        <ItemEditor items={items} setItems={setItems} addLabel="Pridat rucne" />
        {items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid #E5E7EB", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 16 }}>Celkem: <strong>{fmtKg(totalW)} kg</strong></span>
            <button onClick={save} style={S.btn1}>Ulozit prijem</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════
function SuppliersView({ data, onAdd, onDel }) {
  var [name, setName] = useState("")
  var [country, setCountry] = useState("")
  var [sNote, setSNote] = useState("")
  return (
    <div>
      <h2 style={S.secTitle}>Dodavatele</h2>
      <div style={S.card}>
        <h3 style={S.cardT}>Pridat</h3>
        <div style={S.grid3}>
          <Field l="Nazev *"><input value={name} onChange={function(e) { setName(e.target.value) }} placeholder="XYZ GmbH" style={S.inp} /></Field>
          <Field l="Zeme"><input value={country} onChange={function(e) { setCountry(e.target.value) }} placeholder="DE, CN..." style={S.inp} /></Field>
          <Field l="Poznamka"><input value={sNote} onChange={function(e) { setSNote(e.target.value) }} placeholder="Typ zbozi" style={S.inp} /></Field>
        </div>
        <button onClick={function() { if (!name.trim()) return; onAdd({ name: name.trim(), country: country, note: sNote }); setName(""); setCountry(""); setSNote("") }} style={S.btn1}>+ Pridat</button>
      </div>
      <div style={S.card}>
        <h3 style={S.cardT}>Seznam ({data.length})</h3>
        {data.length === 0 ? <p style={S.empty}>Zatim zadni.</p> : data.map(function(s) { return (
          <div key={s.id} style={S.row}>
            <span style={{ fontWeight: 600, flex: 1 }}>{s.name}</span>
            <span style={{ color: "#6B7280", fontSize: 13, width: 50 }}>{s.country}</span>
            <span style={{ color: "#9CA3AF", fontSize: 13, flex: 1 }}>{s.note}</span>
            <button onClick={function() { onDel(s.id) }} style={S.delBtn}>x</button>
          </div>
        ) })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════
function TemplatesView({ data, suppliers, onAdd, onDel }) {
  var [name, setName] = useState("")
  var [supId, setSupId] = useState("__global__")
  var [tplItems, setTplItems] = useState([])

  return (
    <div>
      <h2 style={S.secTitle}>Sablony obalu</h2>
      <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 16, marginTop: 0 }}>
        Kazda sablona = vice polozek. Pri prijmu jednim klikem vlozite celou zasilku.</p>
      <div style={S.card}>
        <h3 style={S.cardT}>Nova sablona</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <Field l="Nazev *"><input value={name} onChange={function(e) { setName(e.target.value) }} placeholder="Typicka zasilka od XYZ" style={S.inp} /></Field>
          <Field l="Dodavatel"><select value={supId} onChange={function(e) { setSupId(e.target.value) }} style={S.inp}>
            <option value="__global__">Spolecna (vsichni)</option>
            {suppliers.map(function(s) { return <option key={s.id} value={s.id}>{s.name}</option> })}</select></Field>
        </div>
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#166534" }}>Polozky ({tplItems.length})</h4>
          <ItemEditor items={tplItems} setItems={setTplItems} addLabel="Pridat obal do sablony" />
        </div>
        <button onClick={function() {
          if (!name.trim() || tplItems.length === 0) return
          onAdd({ name: name.trim(), supplierId: supId, items: tplItems.map(function(it) {
            return { name: it.name, material: it.material, packType: it.packType, unitWeight: it.unitWeight, quantity: it.quantity, reusable: it.reusable, littering: it.littering }
          }) })
          setName(""); setTplItems([])
        }} disabled={!name.trim() || tplItems.length === 0}
          style={{ ...S.btn1, opacity: (!name.trim() || tplItems.length === 0) ? 0.5 : 1 }}>
          Ulozit sablonu ({tplItems.length} pol.)</button>
      </div>
      <div style={S.card}>
        <h3 style={S.cardT}>Existujici ({data.length})</h3>
        {data.length === 0 ? <p style={S.empty}>Zatim zadne.</p> : data.map(function(tpl) {
          var sup = suppliers.find(function(s) { return s.id === (tpl.supplier_id || tpl.supplierId) })
          var ti = tpl.items || []; var tw = ti.reduce(function(s, i) { return s + i.unitWeight * (i.quantity || 1) }, 0)
          return (
            <div key={tpl.id} style={{ ...S.card, marginBottom: 8, padding: "12px 14px", background: "#FAFBFC" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{sup ? sup.name : "Spolecna"} | {ti.length} pol. | {fmtKg(tw)} kg</div>
                </div>
                <button onClick={function() { onDel(tpl.id) }} style={S.delBtn}>x</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ti.map(function(it, idx) { return (
                  <div key={idx} style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{matOf(it.material).icon}</span><span style={{ fontWeight: 600 }}>{it.name}</span>
                    <span style={{ color: "#9CA3AF" }}>{it.quantity || 1}x {it.unitWeight}kg</span>
                  </div>
                ) })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// REPORT
// ═══════════════════════════════════════
function ReportView({ agg, f, selYear, selQ, qSelect }) {
  var exportCSV = function() {
    var csv = "Material;Typ obalu;Hmotnost (kg);Opak. pouzitelne (kg)\n"
    MATERIALS.forEach(function(m) { PACK_TYPES.forEach(function(p) {
      var v = agg.d[m.id][p.id]; if (v.w > 0) csv += m.label + ";" + p.label + ";" + v.w.toFixed(3) + ";" + v.r.toFixed(3) + "\n"
    }) })
    if (agg.litter > 0) csv += "\nLittering;;" + agg.litter.toFixed(3) + "\n"
    csv += "\nCelkem;;" + agg.total.toFixed(3) + "\nObdobi;" + QUARTERS[selQ] + " " + selYear + "\nPocet prijmu;" + f.length + "\n"
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = "ekokom-vykaz-" + selYear + "-Q" + (selQ + 1) + ".csv"; a.click()
  }
  return (
    <div>
      <div style={S.secHead}><h2 style={S.secTitle}>Ctvrtletni vykaz</h2>{qSelect}</div>
      <div style={{ ...S.card, background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#065F46" }}>
          <strong>Vse jako Zpoplatnene obaly</strong> - dovozce, zahranicni dodavatele nemaji smlouvu s EKO-KOM.</p>
      </div>
      <div style={S.card}>
        <h3 style={S.cardT}>Obchodni obaly</h3>
        <table><thead><tr>
          <th style={S.th}>Material</th>
          {PACK_TYPES.filter(function(p) { return p.id !== "prumyslove" }).map(function(p) { return <th key={p.id} style={{ ...S.th, textAlign: "right" }}>{p.label}</th> })}
          <th style={{ ...S.th, textAlign: "right" }}>Celkem</th>
        </tr></thead><tbody>
          {MATERIALS.map(function(m) {
            var r = agg.d[m.id]; var sum = r.prodejni.w + r.skupinove.w + r.prepravni.w; if (sum === 0) return null
            return (<tr key={m.id}><td style={S.td}>{m.label}</td>
              <td style={S.tdR}>{fmtKg(r.prodejni.w)}</td><td style={S.tdR}>{fmtKg(r.skupinove.w)}</td>
              <td style={S.tdR}>{fmtKg(r.prepravni.w)}</td><td style={{ ...S.tdR, fontWeight: 700 }}>{fmtKg(sum)}</td></tr>)
          })}
        </tbody></table>
      </div>
      <div style={S.card}>
        <h3 style={S.cardT}>Prumyslove obaly</h3>
        <table><thead><tr><th style={S.th}>Material</th><th style={{ ...S.th, textAlign: "right" }}>kg</th></tr></thead><tbody>
          {MATERIALS.map(function(m) { var v = agg.d[m.id].prumyslove.w; if (v === 0) return null
            return <tr key={m.id}><td style={S.td}>{m.label}</td><td style={S.tdR}>{fmtKg(v)}</td></tr> })}
        </tbody></table>
      </div>
      {agg.litter > 0 && (
        <div style={{ ...S.card, border: "1px solid #FDE68A", background: "#FFFBEB" }}>
          <h3 style={{ ...S.cardT, color: "#92400E" }}>Littering - jednorazove plasty</h3>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#92400E", margin: "6px 0" }}>{fmtKg(agg.litter)} kg</p>
        </div>
      )}
      <div style={{ ...S.card, background: "#F0FDF4" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, color: "#166534" }}>Celkem za {QUARTERS[selQ]} {selYear}</p>
            <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, color: "#15803D" }}>{fmtKg(agg.total)} kg</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>{f.length} prijmu</p>
          </div>
          <button onClick={exportCSV} style={S.btn1}>Export CSV</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// FIELD + STYLES
// ═══════════════════════════════════════
function Field({ l, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.4px" }}>{l}</label>
      {children}
    </div>
  )
}

var S = {
  header: { background: "#FFF", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 50 },
  headerIn: { maxWidth: 960, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  logoBox: { fontSize: 24, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "#ECFDF5", borderRadius: 10 },
  navBtn: { display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", background: "none", border: "1px solid transparent", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#6B7280", cursor: "pointer" },
  navAct: { background: "#F0FDF4", borderColor: "#BBF7D0", color: "#15803D", fontWeight: 700 },
  main: { maxWidth: 960, margin: "0 auto", padding: "20px 16px" },
  secHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 },
  secTitle: { fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 },
  card: { background: "#FFF", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 14, border: "1px solid #F3F4F6" },
  cardT: { fontSize: 14, fontWeight: 700, color: "#374151", margin: "0 0 12px" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 18 },
  kpi: { background: "#FFF", borderRadius: 12, padding: 14, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 1 },
  kpiL: { fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" },
  kpiV: { fontSize: 26, fontWeight: 800, color: "#111827" },
  kpiU: { fontSize: 11, color: "#6B7280" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 10 },
  inp: { padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#1F2937", background: "#FAFBFC", width: "100%", boxSizing: "border-box" },
  sel: { padding: "5px 8px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13, background: "#FFF", cursor: "pointer" },
  btn1: { padding: "9px 18px", background: "#16A34A", color: "#FFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btn2: { padding: "7px 14px", background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tplBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, cursor: "pointer", minWidth: 0 },
  row: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "#FAFBFC", borderRadius: 8, marginBottom: 4, fontSize: 14, flexWrap: "wrap" },
  qBtn: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#E5E7EB", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15, fontWeight: 700 },
  qInp: { width: 48, textAlign: "center", padding: "4px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 14 },
  delBtn: { background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: 4 },
  chk: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" },
  empty: { color: "#9CA3AF", fontSize: 14, fontStyle: "italic", margin: "6px 0" },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", borderBottom: "2px solid #E5E7EB", background: "#F9FAFB" },
  td: { padding: "8px 10px", borderBottom: "1px solid #F3F4F6" },
  tdR: { padding: "8px 10px", borderBottom: "1px solid #F3F4F6", textAlign: "right", fontVariantNumeric: "tabular-nums" },
  toast: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#15803D", color: "#FFF", padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,.15)", zIndex: 999, animation: "ek-fade .25s ease" },
}
