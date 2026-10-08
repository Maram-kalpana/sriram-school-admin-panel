import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  bulkActive,
  createStudent,
  deleteStudent,
  getStudent,
  importCommit,
  importPreview,
  listStudents,
  updateStudent,
  updateStudentControls,
} from '../api/students'

const emptyForm = {
  admissionNumber: '',
  studentName: '',
  parentName: '',
  address1: '',
  address2: '',
  city: 'Hyderabad',
  state: 'TS',
  zipcode: '',
  houseColor: 'Red',
  phone: '',
  isActive: true,
}

export default function Students() {
  const { isSuperAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [houseColor, setHouseColor] = useState('')
  const [kitStatus, setKitStatus] = useState('')
  const [isActive, setIsActive] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [drawer, setDrawer] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await listStudents({
        page,
        pageSize: pagination.pageSize,
        search,
        houseColor,
        kitStatus,
        isActive,
      })
      setItems(res.data.items)
      setPagination(res.data.pagination)
      setSelected([])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [houseColor, isActive, kitStatus, pagination.pageSize, search])

  useEffect(() => {
    load(1)
  }, [load])

  const allSelected = useMemo(
    () => items.length > 0 && selected.length === items.length,
    [items, selected]
  )

  function toggleAll() {
    setSelected(allSelected ? [] : items.map((s) => s.id))
  }

  function toggleOne(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function openDrawer(id) {
    try {
      const res = await getStudent(id)
      setDrawer(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student')
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(student) {
    setEditing(student)
    setForm({
      admissionNumber: student.admissionNumber,
      studentName: student.studentName,
      parentName: student.parentName,
      address1: student.address1,
      address2: student.address2 || '',
      city: student.city,
      state: student.state,
      zipcode: student.zipcode,
      houseColor: student.houseColor,
      phone: student.phone || '',
      isActive: student.isActive,
    })
    setFormOpen(true)
  }

  async function saveStudent(e) {
    e.preventDefault()
    try {
      const payload = { ...form, phone: form.phone || null }
      if (editing) {
        await updateStudent(editing.id, payload)
        toast.success('Student updated')
      } else {
        await createStudent(payload)
        toast.success('Student created')
      }
      setFormOpen(false)
      load(pagination.page)
      if (drawer?.student?.id === editing?.id) openDrawer(editing.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  async function handleDelete(student) {
    if (!isSuperAdmin) return
    if (!window.confirm(`Delete student ${student.admissionNumber}?`)) return
    try {
      await deleteStudent(student.id)
      toast.success('Deleted')
      setDrawer(null)
      load(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  async function handleBulk(active) {
    if (!selected.length) return
    try {
      await bulkActive(selected, active)
      toast.success(active ? 'Activated' : 'Deactivated')
      load(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed')
    }
  }

  async function saveControls(patch) {
    try {
      const res = await updateStudentControls(drawer.student.id, patch)
      setDrawer((d) => ({ ...d, student: res.data.student }))
      toast.success('Updated')
      load(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  async function onPreviewFile(file) {
    setImportFile(file)
    setPreview(null)
    try {
      const res = await importPreview(file)
      setPreview(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed')
    }
  }

  async function onCommitImport() {
    if (!importFile) return
    setImporting(true)
    try {
      const res = await importCommit(importFile)
      toast.success(`Import done: ${res.data.created} new, ${res.data.updated} updated`)
      setPreview((p) => ({
        ...p,
        commitResult: res.data,
        rowErrors: res.data.rowErrors,
      }))
      load(1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function downloadErrorCsv(csv) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">Import Excel, manage kit access and catalog overrides.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/students/template"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
          >
            Download template
          </a>
          <a
            href="/api/admin/students/export"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
          >
            Export CSV
          </a>
          <button
            type="button"
            onClick={() => {
              setImportOpen(true)
              setImportFile(null)
              setPreview(null)
            }}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Import Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-700"
          >
            Add student
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search admission / name / parent"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={houseColor}
          onChange={(e) => setHouseColor(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All houses</option>
          {['Red', 'Yellow', 'Green', 'Blue'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={kitStatus}
          onChange={(e) => setKitStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All kit status</option>
          <option value="pending">Pending</option>
          <option value="ordered">Ordered</option>
        </select>
        <select
          value={isActive}
          onChange={(e) => setIsActive(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All active</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          type="button"
          onClick={() => load(1)}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
      </div>

      {selected.length > 0 && (
        <div className="flex gap-2">
          <button type="button" onClick={() => handleBulk(true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">
            Activate ({selected.length})
          </button>
          <button type="button" onClick={() => handleBulk(false)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white">
            Deactivate ({selected.length})
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-3 py-3">Admission</th>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">House</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Kit</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">Loading…</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">No students found</td>
              </tr>
            )}
            {!loading &&
              items.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => toggleOne(s.id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{s.admissionNumber}</td>
                  <td className="px-3 py-2">{s.studentName}</td>
                  <td className="px-3 py-2">{s.parentName}</td>
                  <td className="px-3 py-2">{s.houseColor}</td>
                  <td className="px-3 py-2">
                    <InlinePhone
                      value={s.phone || ''}
                      onSave={async (phone) => {
                        await updateStudentControls(s.id, { phone: phone || null })
                        toast.success('Phone saved')
                        load(pagination.page)
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 capitalize">{s.kitStatus}</td>
                  <td className="px-3 py-2">{s.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="text-indigo-600" onClick={() => openDrawer(s.id)}>
                        View
                      </button>
                      <button type="button" className="text-slate-600" onClick={() => openEdit(s)}>
                        Edit
                      </button>
                      {isSuperAdmin && (
                        <button type="button" className="text-red-600" onClick={() => handleDelete(s)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">
          Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => load(pagination.page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <button type="button" className="flex-1" aria-label="Close" onClick={() => setDrawer(null)} />
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{drawer.student.studentName}</h2>
                <p className="text-sm text-slate-500">{drawer.student.admissionNumber} · {drawer.student.houseColor}</p>
              </div>
              <button type="button" onClick={() => setDrawer(null)} className="text-slate-400">✕</button>
            </div>

            <section className="space-y-1 text-sm">
              <p><span className="text-slate-500">Parent:</span> {drawer.student.parentName}</p>
              <p><span className="text-slate-500">Address:</span> {drawer.student.address1}, {drawer.student.address2}</p>
              <p>{drawer.student.city}, {drawer.student.state} {drawer.student.zipcode}</p>
              <p><span className="text-slate-500">Phone:</span> {drawer.student.phone || '—'}</p>
              <p className="capitalize"><span className="text-slate-500">Kit:</span> {drawer.student.kitStatus}</p>
              <p className="capitalize"><span className="text-slate-500">Override:</span> {drawer.student.catalogOverride.replace(/_/g, ' ')}</p>
            </section>

            <section className="mt-6 space-y-3">
              <h3 className="font-semibold">Controls</h3>
              <button
                type="button"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                onClick={() => saveControls({ kitStatus: 'pending' })}
              >
                Reset kit status to pending
              </button>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={drawer.student.catalogOverride}
                onChange={(e) => saveControls({ catalogOverride: e.target.value })}
              >
                <option value="default">Default</option>
                <option value="force_kit">Force kit only</option>
                <option value="force_individual">Force individual products</option>
              </select>
              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
                onClick={() => saveControls({ isActive: !drawer.student.isActive })}
              >
                {drawer.student.isActive ? 'Deactivate login' : 'Activate login'}
              </button>
            </section>

            <section className="mt-6">
              <h3 className="mb-2 font-semibold">Order history</h3>
              {drawer.orders.length === 0 && <p className="text-sm text-slate-400">No orders yet</p>}
              <ul className="space-y-2 text-sm">
                {drawer.orders.map((o) => (
                  <li key={o.id} className="rounded-lg border p-2">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="capitalize text-slate-500">{o.type} · {o.status} · ₹{o.total}</p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={saveStudent} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">{editing ? 'Edit student' : 'Add student'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['admissionNumber', 'Admission number'],
                ['studentName', 'Student name'],
                ['parentName', 'Parent name'],
                ['address1', 'Address 1'],
                ['address2', 'Address 2'],
                ['city', 'City'],
                ['state', 'State'],
                ['zipcode', 'Zipcode'],
                ['houseColor', 'House color'],
                ['phone', 'Phone'],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  <span className="mb-1 block text-slate-600">{label}</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key !== 'address2' && key !== 'phone'}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">Save</button>
            </div>
          </form>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Import students (Excel)</h2>
              <button type="button" onClick={() => setImportOpen(false)}>✕</button>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && onPreviewFile(e.target.files[0])}
            />
            {preview && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['New', preview.counts.new],
                    ['Will update', preview.counts.willUpdate],
                    ['Invalid', preview.counts.invalid],
                    ['Dupes in file', preview.counts.duplicateInFile],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Admission</th>
                        <th className="px-2 py-2">Name</th>
                        <th className="px-2 py-2">House</th>
                        <th className="px-2 py-2">City</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.map((r) => (
                        <tr key={r.rowNumber} className="border-t">
                          <td className="px-2 py-1">{r.rowNumber}</td>
                          <td className="px-2 py-1">{r.admissionNumber}</td>
                          <td className="px-2 py-1">{r.studentName}</td>
                          <td className="px-2 py-1">{r.houseColor}</td>
                          <td className="px-2 py-1">{r.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.rowErrors?.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-red-700">Row errors</h3>
                      <button
                        type="button"
                        className="text-sm text-indigo-600"
                        onClick={() => {
                          const csv =
                            preview.commitResult?.errorReportCsv ||
                            [
                              'row,admissionNumber,messages',
                              ...preview.rowErrors.map(
                                (e) =>
                                  `${e.row},"${e.admissionNumber || ''}","${(e.messages || []).join('; ').replace(/"/g, '""')}"`
                              ),
                            ].join('\n')
                          downloadErrorCsv(csv)
                        }}
                      >
                        Download error report (CSV)
                      </button>
                    </div>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-red-700">
                      {preview.rowErrors.map((e) => (
                        <li key={`${e.row}-${e.admissionNumber}`}>
                          Row {e.row} ({e.admissionNumber || '—'}): {(e.messages || []).join('; ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setImportOpen(false)} className="rounded-lg border px-3 py-2 text-sm">
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={importing || !importFile}
                    onClick={onCommitImport}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {importing ? 'Importing…' : 'Confirm import'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InlinePhone({ value, onSave }) {
  const [v, setV] = useState(value)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setV(value)
  }, [value])

  if (!editing) {
    return (
      <button type="button" className="text-left text-slate-700 hover:text-indigo-600" onClick={() => setEditing(true)}>
        {value || 'Add phone'}
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1">
      <input
        className="w-28 rounded border px-1 py-0.5 text-xs"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        type="button"
        className="text-xs text-indigo-600"
        onClick={async () => {
          await onSave(v)
          setEditing(false)
        }}
      >
        Save
      </button>
    </span>
  )
}
