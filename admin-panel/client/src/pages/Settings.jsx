import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getSettings, saveSettings } from '../api/admin'

export default function Settings() {
  const [form, setForm] = useState({
    catalog_switch_rule: 'after_kit_order',
    extra_login_check: 'none',
    allow_kit_reorder: false,
    shipping_fee: 0,
    school_name: 'Scholar Store',
    school_logo: '',
    order_number_prefix: 'SS',
  })

  useEffect(() => {
    getSettings().then((res) => {
      setForm((f) => ({ ...f, ...res.data.settings }))
    }).catch((err) => toast.error(err.response?.data?.message || 'Failed to load'))
  }, [])

  async function onSave(e) {
    e.preventDefault()
    try {
      await saveSettings({
        ...form,
        shipping_fee: Number(form.shipping_fee),
        allow_kit_reorder: Boolean(form.allow_kit_reorder),
        school_logo: form.school_logo || null,
      })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={onSave} className="space-y-4 rounded-xl border bg-white p-5">
        <label className="block text-sm">Catalog switching rule
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.catalog_switch_rule} onChange={(e) => setForm((f) => ({ ...f, catalog_switch_rule: e.target.value }))}>
            <option value="after_kit_order">After kit order</option>
            <option value="after_first_login">After first login</option>
          </select>
        </label>
        <label className="block text-sm">Extra student login check
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.extra_login_check} onChange={(e) => setForm((f) => ({ ...f, extra_login_check: e.target.value }))}>
            <option value="none">None</option>
            <option value="zipcode">Zipcode</option>
            <option value="parent_phone">Parent phone</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(form.allow_kit_reorder)} onChange={(e) => setForm((f) => ({ ...f, allow_kit_reorder: e.target.checked }))} />
          Allow kit re-order
        </label>
        <label className="block text-sm">Flat shipping fee
          <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.shipping_fee ?? 0} onChange={(e) => setForm((f) => ({ ...f, shipping_fee: e.target.value }))} />
        </label>
        <label className="block text-sm">School name
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.school_name || ''} onChange={(e) => setForm((f) => ({ ...f, school_name: e.target.value }))} />
        </label>
        <label className="block text-sm">School logo URL
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.school_logo || ''} onChange={(e) => setForm((f) => ({ ...f, school_logo: e.target.value }))} />
        </label>
        <label className="block text-sm">Order number prefix
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.order_number_prefix || 'SS'} onChange={(e) => setForm((f) => ({ ...f, order_number_prefix: e.target.value }))} />
        </label>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save settings</button>
      </form>
    </div>
  )
}
