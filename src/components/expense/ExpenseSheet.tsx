import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useExpenseSheet, type ExpenseSheetMode } from '@/hooks/useExpenseSheet'
import { useExpenses } from '@/hooks/useExpenses'
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
  getExpenseTotal,
} from '@/lib/calc'
import { formatNOK } from '@/lib/format'
import type { Expense, ExpenseFormData, ExpenseStatus } from '@/lib/types'
import type { LocalExpense } from '@/lib/localStore'

const PREFS_KEY = 'renover-expense-prefs'
const AUTOSAVE_MS = 400

type FormLayout = 'plan' | 'buy' | 'convert'

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
    !!form.supplier.trim()
  )
}

function toExpenseView(local: LocalExpense): Expense {
  return {
    ...local,
    project_id: '',
    unit: local.unit,
  }
}

function resolveLayout(
  mode: ExpenseSheetMode,
  defaultStatus: 'planned' | 'purchased',
  editing: Expense | null,
): FormLayout {
  if (mode === 'purchase') return 'convert'
  if (mode === 'edit' && editing) {
    return editing.status === 'purchased' || editing.status === 'paid' ? 'buy' : 'plan'
  }
  return defaultStatus === 'purchased' ? 'buy' : 'plan'
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
  const { members } = useProject()
  const { memberId } = useAuth()

  const roomOptions = (rooms ?? []).map((r) => ({ value: r.id, label: r.name }))
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))
  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.profile?.display_name ?? m.display_name ?? 'Medlem',
  }))

  const prefs = loadPrefs()
  const layout = resolveLayout(mode, defaultStatus, editingExpense)
  const isBuyLike = layout === 'buy' || layout === 'convert'

  let initialForm: ExpenseFormData
  if (editingExpense) {
    initialForm = expenseToForm(editingExpense)
    if (layout === 'convert') {
      initialForm = {
        ...initialForm,
        status: 'purchased',
        who_paid: memberId ?? initialForm.who_paid,
        quantity: 1,
        unit: 'stk',
        // Keep estimate as starting amount (unit_price already set)
      }
    } else if (layout === 'plan') {
      initialForm = { ...initialForm, status: 'planned', quantity: 1, unit: 'stk' }
    } else {
      initialForm = {
        ...initialForm,
        status: initialForm.status === 'paid' ? 'paid' : 'purchased',
        who_paid: initialForm.who_paid || memberId || '',
        quantity: 1,
        unit: 'stk',
      }
    }
  } else {
    initialForm = {
      ...defaultExpenseForm(),
      ...prefs,
      room_id: defaultRoomId ?? prefs.room_id ?? null,
      description: '',
      quantity: 1,
      unit: 'stk',
      unit_price: 0,
      total_override: null,
      discount_percent: null,
      discount_amount: null,
      notes: '',
      supplier: isBuyLike ? (prefs.supplier ?? '') : '',
      expense_date: new Date().toISOString().split('T')[0],
      status: isBuyLike ? 'purchased' : 'planned',
      who_paid: isBuyLike ? (memberId ?? prefs.who_paid ?? '') : '',
    }
  }

  const flushCloseRef = useRef<() => void>(() => close())

  const title =
    layout === 'convert'
      ? 'Registrer kjøp'
      : layout === 'buy'
        ? editingExpense
          ? 'Rediger kjøp'
          : 'Nytt kjøp'
        : editingExpense
          ? 'Rediger plan'
          : 'Planlegg'

  const plannedSummary =
    layout === 'convert' && editingExpense
      ? {
          description: editingExpense.description,
          estimate: getExpenseTotal(editingExpense),
        }
      : null

  return (
    <Sheet open={isOpen} onClose={() => flushCloseRef.current()} title={title}>
      {isOpen && (
        <ExpenseForm
          key={`${editingExpense?.id ?? 'new'}-${layout}-${focusField}`}
          initial={initialForm}
          expenseId={editingExpense?.id ?? null}
          layout={layout}
          focusField={focusField}
          plannedSummary={plannedSummary}
          roomOptions={roomOptions}
          categoryOptions={categoryOptions}
          memberOptions={memberOptions}
          onCreated={(expense) => setEditingExpense(toExpenseView(expense))}
          onClose={close}
          registerCloseHandler={(fn) => {
            flushCloseRef.current = fn
          }}
          createExpense={(form) => createExpense.mutateAsync(form)}
          updateExpense={(args) => updateExpense.mutateAsync(args)}
          softDeleteExpense={(args) => softDeleteExpense.mutateAsync(args)}
        />
      )}
    </Sheet>
  )
}

function ExpenseForm({
  initial,
  expenseId,
  layout,
  focusField,
  plannedSummary,
  roomOptions,
  categoryOptions,
  memberOptions,
  onCreated,
  onClose,
  registerCloseHandler,
  createExpense,
  updateExpense,
  softDeleteExpense,
}: {
  initial: ExpenseFormData
  expenseId: string | null
  layout: FormLayout
  focusField: 'description' | 'unit_price'
  plannedSummary: { description: string; estimate: number } | null
  roomOptions: { value: string; label: string }[]
  categoryOptions: { value: string; label: string }[]
  memberOptions: { value: string; label: string }[]
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
}) {
  const lockedStatus: ExpenseStatus = layout === 'plan' ? 'planned' : 'purchased'
  const [form, setForm] = useState<ExpenseFormData>({
    ...initial,
    status: lockedStatus,
    quantity: 1,
    unit: 'stk',
  })
  const [savedId, setSavedId] = useState<string | null>(expenseId)
  const [showDiscount, setShowDiscount] = useState(
    layout !== 'plan' || !!(initial.discount_percent || initial.discount_amount),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
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
    const locked = {
      ...nextForm,
      status: lockedStatus,
      quantity: 1,
      unit: 'stk',
    }
    if (!isMeaningful(locked) && !id) return id
    setSaveState('saving')
    try {
      if (!id) {
        if (creatingRef.current) return id
        creatingRef.current = true
        const created = await createExpense(locked)
        creatingRef.current = false
        setSavedId(created.id)
        onCreated(created)
        savePrefs(locked)
        setSaveState('saved')
        return created.id
      }
      await updateExpense({ id, form: locked, quiet: true })
      savePrefs(locked)
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
      const next = {
        ...f,
        ...patch,
        status: lockedStatus,
        quantity: 1,
        unit: 'stk',
      }
      formRef.current = next
      scheduleSave(next)
      return next
    })
    setSaveState((s) => (s === 'saved' ? 'idle' : s))
  }

  const setAmount = (value: number) => {
    update({ unit_price: value, quantity: 1, unit: 'stk', total_override: null })
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
    } else if (id) {
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

  const total = calculateTotal(form)
  const subtotal = calculateSubtotal(form.quantity, form.unit_price)
  const discount = calculateDiscount(subtotal, form.discount_percent, form.discount_amount)

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

      {layout === 'convert' && plannedSummary && (
        <div className="rounded-xl border border-border bg-white/70 px-4 py-3">
          <p className="text-xs text-muted uppercase tracking-wide">Fra plan</p>
          <p className="font-medium mt-0.5">{plannedSummary.description}</p>
          {plannedSummary.estimate > 0 && (
            <p className="text-sm text-muted mt-1">
              Estimat {formatNOK(plannedSummary.estimate)}
            </p>
          )}
        </div>
      )}

      {layout !== 'convert' && (
        <Input
          ref={descRef}
          label="Beskrivelse"
          value={form.description === 'Uten tittel' ? '' : form.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder={layout === 'plan' ? 'F.eks. Parkett eik' : 'Hva kjøpte du?'}
        />
      )}

      <Input
        ref={priceRef}
        label={layout === 'plan' ? 'Estimert beløp (NOK)' : 'Beløp (NOK)'}
        type="number"
        min={0}
        step="any"
        value={form.unit_price || ''}
        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
        placeholder={layout === 'plan' ? 'Valgfritt' : '0'}
      />

      {(layout === 'buy' || layout === 'convert') && (
        <>
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-emerald-700">
                <span>Rabatt</span>
                <span>−{formatNOK(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-lg font-semibold">
              <span>Totalt</span>
              <span className="text-primary">{formatNOK(total)}</span>
            </div>
          </div>

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

          <Input
            label="Dato"
            type="date"
            value={form.expense_date}
            onChange={(e) => update({ expense_date: e.target.value })}
          />
        </>
      )}

      {layout === 'plan' && form.unit_price > 0 && (
        <p className="text-sm text-muted">Estimat: {formatNOK(total)}</p>
      )}

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
