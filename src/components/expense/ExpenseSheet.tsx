import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useExpenses, uploadReceipt } from '@/hooks/useExpenses'
import { useRooms } from '@/hooks/useRooms'
import { useCategories } from '@/hooks/useCategories'
import { useProject } from '@/hooks/useProject'
import { useAuth } from '@/hooks/useAuth'
import {
  calculateTotal,
  calculateSubtotal,
  calculateDiscount,
  defaultExpenseForm,
  expenseToForm,
} from '@/lib/calc'
import { formatNOK } from '@/lib/format'
import {
  EXPENSE_STATUS_LABELS,
  DEFAULT_UNITS,
  type Expense,
  type ExpenseFormData,
  type ExpenseStatus,
} from '@/lib/types'
import type { LocalExpense } from '@/lib/localStore'

const PREFS_KEY = 'renover-expense-prefs'
const AUTOSAVE_MS = 400

function loadPrefs(): Partial<ExpenseFormData> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<ExpenseFormData>
  } catch {
    return {}
  }
}

function savePrefs(form: ExpenseFormData) {
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({
      unit: form.unit,
      supplier: form.supplier,
      category_id: form.category_id,
      room_id: form.room_id,
      who_paid: form.who_paid,
      status: form.status,
    }),
  )
}

function isMeaningful(form: ExpenseFormData) {
  return (
    form.description.trim().length > 0 ||
    form.unit_price > 0 ||
    (form.total_override != null && form.total_override > 0) ||
    !!form.supplier.trim() ||
    !!form.notes.trim()
  )
}

function toExpenseView(local: LocalExpense): Expense {
  return {
    ...local,
    project_id: '',
    unit: local.unit,
  }
}

export function ExpenseSheet() {
  const {
    isOpen,
    editingExpense,
    defaultRoomId,
    defaultStatus,
    mode,
    focusField,
    setEditingExpense,
    close,
  } = useExpenseSheet()
  const { createExpense, updateExpense, softDeleteExpense } = useExpenses()
  const { data: rooms } = useRooms()
  const { data: categories } = useCategories()
  const { project, members } = useProject()
  const { user, memberId } = useAuth()

  const statusOptions = Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const roomOptions = (rooms ?? []).map((r) => ({ value: r.id, label: r.name }))
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))
  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.profile?.display_name ?? m.display_name ?? 'Medlem',
  }))

  const prefs = loadPrefs()
  const isPurchase = mode === 'purchase' || defaultStatus === 'purchased'

  let initialForm: ExpenseFormData
  if (editingExpense) {
    initialForm = expenseToForm(editingExpense)
    if (mode === 'purchase') {
      initialForm = {
        ...initialForm,
        status: 'purchased',
        who_paid: memberId ?? initialForm.who_paid,
      }
    }
  } else {
    initialForm = {
      ...defaultExpenseForm(),
      ...prefs,
      room_id: defaultRoomId ?? prefs.room_id ?? null,
      description: '',
      quantity: 1,
      unit_price: 0,
      total_override: null,
      discount_percent: null,
      discount_amount: null,
      notes: '',
      expense_date: new Date().toISOString().split('T')[0],
      status: defaultStatus,
      who_paid: isPurchase ? (memberId ?? prefs.who_paid ?? '') : (prefs.who_paid ?? ''),
    }
  }

  const flushCloseRef = useRef<() => void>(() => close())

  const title =
    mode === 'purchase'
      ? 'Registrer kjøp'
      : editingExpense
        ? 'Rediger utgift'
        : defaultStatus === 'purchased'
          ? 'Nytt kjøp'
          : 'Ny planlagt'

  return (
    <Sheet open={isOpen} onClose={() => flushCloseRef.current()} title={title}>
      {isOpen && (
        <ExpenseForm
          key={`${editingExpense?.id ?? 'new'}-${mode}-${defaultStatus}-${focusField}`}
          initial={initialForm}
          expenseId={editingExpense?.id ?? null}
          focusField={focusField}
          isPurchaseLayout={isPurchase}
          roomOptions={roomOptions}
          categoryOptions={categoryOptions}
          memberOptions={memberOptions}
          statusOptions={statusOptions}
          projectId={project?.id}
          userId={user?.id}
          onCreated={(expense) => setEditingExpense(toExpenseView(expense))}
          onClose={close}
          registerCloseHandler={(fn) => {
            flushCloseRef.current = fn
          }}
          createExpense={(form) => createExpense.mutateAsync(form)}
          updateExpense={(args) => updateExpense.mutateAsync(args)}
          softDeleteExpense={(args) => softDeleteExpense.mutateAsync(args)}
          uploadReceipt={uploadReceipt}
        />
      )}
    </Sheet>
  )
}

function ExpenseForm({
  initial,
  expenseId,
  focusField,
  isPurchaseLayout,
  roomOptions,
  categoryOptions,
  memberOptions,
  statusOptions,
  projectId,
  userId,
  onCreated,
  onClose,
  registerCloseHandler,
  createExpense,
  updateExpense,
  softDeleteExpense,
  uploadReceipt,
}: {
  initial: ExpenseFormData
  expenseId: string | null
  focusField: 'description' | 'unit_price'
  isPurchaseLayout: boolean
  roomOptions: { value: string; label: string }[]
  categoryOptions: { value: string; label: string }[]
  memberOptions: { value: string; label: string }[]
  statusOptions: { value: string; label: string }[]
  projectId?: string
  userId?: string
  onCreated: (expense: LocalExpense) => void
  onClose: () => void
  registerCloseHandler: (fn: () => void) => void
  createExpense: (form: ExpenseFormData) => Promise<LocalExpense>
  updateExpense: (args: {
    id: string
    form: ExpenseFormData
    quiet?: boolean
  }) => Promise<unknown>
  softDeleteExpense: (id: string | { id: string; quiet?: boolean }) => Promise<unknown>
  uploadReceipt: (
    expenseId: string,
    file: File,
    projectId: string,
    userId?: string,
  ) => Promise<unknown>
}) {
  const [form, setForm] = useState<ExpenseFormData>(initial)
  const [savedId, setSavedId] = useState<string | null>(expenseId)
  const [showAdvanced, setShowAdvanced] = useState(isPurchaseLayout)
  const [showDiscount, setShowDiscount] = useState(
    isPurchaseLayout || !!(initial.discount_percent || initial.discount_amount),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const formRef = useRef(form)
  const savedIdRef = useRef(savedId)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const creatingRef = useRef(false)

  formRef.current = form
  savedIdRef.current = savedId

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (focusField === 'unit_price') priceRef.current?.focus()
      else descRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [focusField])

  const persist = async (nextForm: ExpenseFormData, id: string | null) => {
    if (!isMeaningful(nextForm) && !id) return id
    setSaveState('saving')
    try {
      if (!id) {
        if (creatingRef.current) return id
        creatingRef.current = true
        const created = await createExpense(nextForm)
        creatingRef.current = false
        setSavedId(created.id)
        onCreated(created as Awaited<ReturnType<typeof createExpense>>)
        savePrefs(nextForm)
        setSaveState('saved')
        return created.id
      }
      await updateExpense({ id, form: nextForm, quiet: true })
      savePrefs(nextForm)
      setSaveState('saved')
      return id
    } catch (err) {
      creatingRef.current = false
      setSaveState('idle')
      toast.error(err instanceof Error ? err.message : 'Kunne ikke lagre')
      return id
    }
  }

  const scheduleSave = (nextForm: ExpenseFormData) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void persist(nextForm, savedIdRef.current)
    }, AUTOSAVE_MS)
  }

  const update = (patch: Partial<ExpenseFormData>) => {
    setForm((f) => {
      const next = { ...f, ...patch }
      formRef.current = next
      scheduleSave(next)
      return next
    })
    setSaveState((s) => (s === 'saved' ? 'idle' : s))
  }

  const flushAndClose = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const current = formRef.current
    let id = savedIdRef.current
    if (isMeaningful(current)) {
      id = await persist(current, id)
      if (receiptFile && id && projectId) {
        await uploadReceipt(id, receiptFile, projectId, userId)
      }
    } else if (id) {
      // Empty draft — remove so it doesn't clutter the list
      await softDeleteExpense({ id, quiet: true })
    }
    onClose()
  }

  useEffect(() => {
    registerCloseHandler(() => {
      void flushAndClose()
    })
  })

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const subtotal = calculateSubtotal(form.quantity, form.unit_price)
  const discount = calculateDiscount(subtotal, form.discount_percent, form.discount_amount)
  const total = calculateTotal(form)

  const saveLabel =
    saveState === 'saving' ? 'Lagrer…' : saveState === 'saved' ? 'Lagret' : 'Endringer lagres automatisk'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void flushAndClose()
      }}
      className="space-y-4 pb-6"
    >
      <p className="text-xs text-muted -mt-1">{saveLabel}</p>

      <Input
        ref={descRef}
        label="Beskrivelse"
        value={form.description === 'Uten tittel' ? '' : form.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="F.eks. Parkett eik"
      />

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Antall"
          type="number"
          min={0}
          step="any"
          value={form.quantity}
          onChange={(e) => update({ quantity: parseFloat(e.target.value) || 0 })}
        />
        <Select
          label="Enhet"
          value={form.unit}
          onChange={(e) => update({ unit: e.target.value })}
          options={DEFAULT_UNITS.map((u) => ({ value: u, label: u }))}
        />
        <Input
          ref={priceRef}
          label="Pris/enhet"
          type="number"
          min={0}
          step="any"
          value={form.unit_price || ''}
          onChange={(e) => update({ unit_price: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span>{formatNOK(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm mt-1 text-emerald-700">
            <span>Rabatt</span>
            <span>−{formatNOK(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-display text-lg font-semibold mt-2 pt-2 border-t border-primary/10">
          <span>Total</span>
          <span className="text-primary">{formatNOK(total)}</span>
        </div>
      </div>

      {isPurchaseLayout && (
        <>
          <Select
            label="Betalt av"
            value={form.who_paid}
            onChange={(e) => update({ who_paid: e.target.value })}
            options={memberOptions}
            placeholder="Velg person"
          />
          <Input
            label="Leverandør"
            value={form.supplier}
            onChange={(e) => update({ supplier: e.target.value })}
            placeholder="F.eks. Byggmakker"
          />
        </>
      )}

      <Select
        label="Status"
        value={form.status}
        onChange={(e) => update({ status: e.target.value as ExpenseStatus })}
        options={statusOptions}
      />

      <Select
        label="Rom"
        value={form.room_id ?? ''}
        onChange={(e) => update({ room_id: e.target.value || null })}
        options={roomOptions}
        placeholder="Velg rom"
      />

      <Select
        label="Kategori"
        value={form.category_id ?? ''}
        onChange={(e) => update({ category_id: e.target.value || null })}
        options={categoryOptions}
        placeholder="Velg kategori"
      />

      <InlineNewCategory onCreated={(id) => update({ category_id: id })} />

      <button
        type="button"
        onClick={() => setShowDiscount(!showDiscount)}
        className="flex items-center gap-2 text-sm text-primary font-medium"
      >
        {showDiscount ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Rabatt
      </button>

      {showDiscount && (
        <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-primary/20">
          <Input
            label="Rabatt %"
            type="number"
            min={0}
            max={100}
            value={form.discount_percent ?? ''}
            onChange={(e) =>
              update({
                discount_percent: e.target.value ? parseFloat(e.target.value) : null,
                discount_amount: null,
              })
            }
          />
          <Input
            label="Rabatt kr"
            type="number"
            min={0}
            value={form.discount_amount ?? ''}
            onChange={(e) =>
              update({
                discount_amount: e.target.value ? parseFloat(e.target.value) : null,
                discount_percent: null,
              })
            }
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-primary font-medium"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Flere detaljer
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-2 border-l-2 border-primary/20">
          {!isPurchaseLayout && (
            <Input
              label="Leverandør"
              value={form.supplier}
              onChange={(e) => update({ supplier: e.target.value })}
              placeholder="F.eks. Byggmakker"
            />
          )}
          <Input
            label="Dato"
            type="date"
            value={form.expense_date}
            onChange={(e) => update({ expense_date: e.target.value })}
          />
          {!isPurchaseLayout && (
            <Select
              label="Betalt av"
              value={form.who_paid}
              onChange={(e) => update({ who_paid: e.target.value })}
              options={memberOptions}
              placeholder="Velg person"
            />
          )}
          <Input
            label="Overstyr total"
            type="number"
            min={0}
            value={form.total_override ?? ''}
            onChange={(e) =>
              update({ total_override: e.target.value ? parseFloat(e.target.value) : null })
            }
            placeholder="Valgfritt"
          />
          <Textarea
            label="Notater"
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Ekstra info..."
          />
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Kvittering
            </label>
            <label className="flex items-center gap-3 h-11 px-4 rounded-xl border border-dashed border-border bg-white/50 cursor-pointer hover:bg-white/80 transition-colors">
              <Upload className="h-4 w-4 text-muted" />
              <span className="text-sm text-muted truncate">
                {receiptFile ? receiptFile.name : 'Last opp kvittering'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full">
        Ferdig
      </Button>
    </form>
  )
}

function InlineNewCategory({ onCreated }: { onCreated: (id: string) => void }) {
  const { createCategory } = useCategories()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-primary font-medium"
      >
        + Ny kategori
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white/70 p-3 space-y-3">
      <Input
        label="Ny kategori"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="F.eks. Materialer"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => {
            setOpen(false)
            setName('')
          }}
        >
          Avbryt
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={saving || !name.trim()}
          onClick={async () => {
            setSaving(true)
            try {
              const cat = await createCategory.mutateAsync({
                name: name.trim(),
                budget: 0,
              })
              onCreated(cat.id)
              toast.success('Kategori lagt til')
              setOpen(false)
              setName('')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Kunne ikke legge til')
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Lagrer...' : 'Lagre'}
        </Button>
      </div>
    </div>
  )
}
