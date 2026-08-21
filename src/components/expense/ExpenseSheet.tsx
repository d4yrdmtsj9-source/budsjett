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
import { DEFAULT_UNITS, type Expense, type ExpenseFormData, type ExpenseStatus } from '@/lib/types'
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
  // Default quantity: 1 alone must not count — open/close would leave empty drafts.
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

function QtyPriceFields({
  form,
  priceRef,
  priceLabel,
  onUpdate,
}: {
  form: ExpenseFormData
  priceRef: React.RefObject<HTMLInputElement | null>
  priceLabel: string
  onUpdate: (patch: Partial<ExpenseFormData>) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Input
        label="Antall"
        type="number"
        min={0}
        step="any"
        value={form.quantity || ''}
        onChange={(e) =>
          onUpdate({ quantity: parseFloat(e.target.value) || 0, total_override: null })
        }
      />
      <Select
        label="Enhet"
        value={form.unit}
        onChange={(e) => onUpdate({ unit: e.target.value })}
        options={DEFAULT_UNITS.map((u) => ({ value: u, label: u }))}
      />
      <Input
        ref={priceRef}
        label={priceLabel}
        type="number"
        min={0}
        step="any"
        value={form.unit_price || ''}
        onChange={(e) =>
          onUpdate({ unit_price: parseFloat(e.target.value) || 0, total_override: null })
        }
      />
    </div>
  )
}

export function ExpenseSheet() {
  const {
    isOpen,
    editingExpense,
    defaultRoomId,
    defaultStatus,
    mode,
    focusField,
    formInstanceId,
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
        // Keep planned quantity / unit / unit_price as starting point
      }
    } else if (layout === 'plan') {
      initialForm = { ...initialForm, status: 'planned' }
    } else {
      initialForm = {
        ...initialForm,
        status: initialForm.status === 'paid' ? 'paid' : 'purchased',
        who_paid: initialForm.who_paid || memberId || '',
      }
    }
  } else {
    initialForm = {
      ...defaultExpenseForm(),
      ...prefs,
      room_id: defaultRoomId ?? prefs.room_id ?? null,
      description: '',
      quantity: 1,
      unit: prefs.unit || 'stk',
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
        ? mode === 'edit'
          ? 'Rediger kjøp'
          : 'Nytt kjøp'
        : mode === 'edit'
          ? 'Rediger plan'
          : 'Planlegg'

  const plannedSummary =
    layout === 'convert' && editingExpense
      ? {
          description: editingExpense.description,
          estimate: getExpenseTotal(editingExpense),
          qtyHint:
            editingExpense.quantity > 0
              ? `${editingExpense.quantity} ${editingExpense.unit || 'stk'}`
              : null,
        }
      : null

  return (
    <Sheet open={isOpen} onClose={() => flushCloseRef.current()} title={title}>
      {isOpen && (
        <ExpenseForm
          // formInstanceId only bumps when the sheet is opened — never on autosave,
          // otherwise the form remounts mid-typing and the page jumps.
          key={formInstanceId}
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
  plannedSummary: {
    description: string
    estimate: number
    qtyHint: string | null
  } | null
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
    // Autofocus once when this form instance mounts — not again on re-renders.
    const t = window.setTimeout(() => {
      if (focusField === 'unit_price') priceRef.current?.focus({ preventScroll: true })
      else descRef.current?.focus({ preventScroll: true })
    }, 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only for this formInstance
  }, [])

  const persist = async (nextForm: ExpenseFormData, id: string | null) => {
    const locked: ExpenseFormData = {
      ...nextForm,
      status: lockedStatus,
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
      const next: ExpenseFormData = {
        ...f,
        ...patch,
        status: lockedStatus,
      }
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
      className="space-y-4 pb-28"
    >
      <p className="text-xs text-muted -mt-1">{saveLabel}</p>

      {layout === 'convert' && plannedSummary && (
        <div className="rounded-xl border border-border bg-white/70 px-4 py-3">
          <p className="text-xs text-muted uppercase tracking-wide">Fra plan</p>
          <p className="font-medium mt-0.5">{plannedSummary.description}</p>
          <p className="text-sm text-muted mt-1">
            {plannedSummary.qtyHint ? `${plannedSummary.qtyHint} · ` : ''}
            Estimat {formatNOK(plannedSummary.estimate)}
          </p>
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

      <QtyPriceFields
        form={form}
        priceRef={priceRef}
        priceLabel={layout === 'plan' ? 'Pris/enhet' : 'Pris/enhet'}
        onUpdate={update}
      />

      {layout === 'plan' && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <div className="flex justify-between text-sm text-muted mb-1">
            <span>
              {form.quantity || 0} {form.unit || 'stk'} × {formatNOK(form.unit_price || 0)}
            </span>
          </div>
          <div className="flex justify-between font-display text-lg font-semibold">
            <span>Estimat</span>
            <span className="text-primary">{formatNOK(total)}</span>
          </div>
        </div>
      )}

      {(layout === 'buy' || layout === 'convert') && (
        <>
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
              <span>Totalt</span>
              <span className="text-primary">{formatNOK(total)}</span>
            </div>
          </div>

          <Input
            label="Leverandør"
            value={form.supplier}
            onChange={(e) => update({ supplier: e.target.value })}
            placeholder="F.eks. Byggmakker"
          />

          <Select
            label="Betalt av"
            value={form.who_paid}
            onChange={(e) => update({ who_paid: e.target.value })}
            options={memberOptions}
            placeholder="Velg person"
          />
        </>
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

      {(layout === 'buy' || layout === 'convert') && (
        <>
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 30)
    return () => clearTimeout(t)
  }, [open])

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
        ref={inputRef}
        label="Ny kategori"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="F.eks. Materialer"
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
