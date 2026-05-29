import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ─── Database operations ───

export async function loadSuppliers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error('Load suppliers:', error); return [] }
  return data || []
}

export async function saveSupplier(supplier) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplier)
    .select()
    .single()
  if (error) { console.error('Save supplier:', error); return null }
  return data
}

export async function deleteSupplier(id) {
  if (!supabase) return false
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) { console.error('Delete supplier:', error); return false }
  return true
}

export async function loadTemplates() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error('Load templates:', error); return [] }
  return data || []
}

export async function saveTemplate(template) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('templates')
    .insert(template)
    .select()
    .single()
  if (error) { console.error('Save template:', error); return null }
  return data
}

export async function deleteTemplate(id) {
  if (!supabase) return false
  const { error } = await supabase.from('templates').delete().eq('id', id)
  if (error) { console.error('Delete template:', error); return false }
  return true
}

export async function loadReceipts() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('receipt_date', { ascending: false })
  if (error) { console.error('Load receipts:', error); return [] }
  return (data || []).map(r => ({
    id: r.id,
    date: r.receipt_date,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    note: r.note,
    items: r.items || [],
  }))
}

export async function saveReceipt(receipt) {
  if (!supabase) return null
  const row = {
    receipt_date: receipt.date,
    supplier_id: receipt.supplierId || null,
    supplier_name: receipt.supplierName,
    note: receipt.note,
    items: receipt.items,
  }
  const { data, error } = await supabase
    .from('receipts')
    .insert(row)
    .select()
    .single()
  if (error) { console.error('Save receipt:', error); return null }
  return { ...receipt, id: data.id }
}

export async function updateReceipt(receipt) {
  if (!supabase) return false
  const { error } = await supabase
    .from('receipts')
    .update({
      items: receipt.items,
      note: receipt.note,
    })
    .eq('id', receipt.id)
  if (error) { console.error('Update receipt:', error); return false }
  return true
}

export async function deleteReceipt(id) {
  if (!supabase) return false
  const { error } = await supabase.from('receipts').delete().eq('id', id)
  if (error) { console.error('Delete receipt:', error); return false }
  return true
}
