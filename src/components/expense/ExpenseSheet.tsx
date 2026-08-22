import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { SuggestInput } from '@/components/ui/SuggestInput'
import { uniqueSuggestions, normalizeSuggest } from '@/lib/suggest'
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
  sumPaidExpenses,
  sumPlannedExpenses,
  budgetRemaining,
  affordSentence,
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
  return form.description.trim().length > 0
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
  priceLabel,
  onUpdate,
}: {
  form: ExpenseFormData
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
        inputMode="decimal"
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
        label={priceLabel}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
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
  const { createExpense, updateExpense, expenses } = useExpenses()
  const { data: rooms } = useRooms()
  const { data: categories, createCategory } = useCategories()
  const { members, project } = useProject()
  const { memberId } = useAuth()

  const roomOptions = (rooms ?? []).map((r) => ({ value: r.id, label: r.name }))
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
      supplier: prefs.supplier ?? '',
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
          key={formInstanceId}
          initial={initialForm}
          expenseId={editingExpense?.id ?? null}
          layout={layout}
          focusAmount={isBuyLike && focusField === 'unit_price'}
          plannedSummary={plannedSummary}
          roomOptions={roomOptions}
          memberOptions={memberOptions}
          rooms={rooms ?? []}
          categories={categories ?? []}
          expenses={expenses}
          projectBudget={project?.total_budget ?? 0}
          createCategory={(name) => createCategory.mutateAsync({ name, budget: 0 })}
          onCreated={(expense) => setEditingExpense(toExpenseView(expense))}
          onClose={close}
          registerCloseHandler={(fn) => {
            flushCloseRef.current = fn
          }}
          createExpense={(form) => createExpense.mutateAsync(form)}
          updateExpense={(args) => updateExpense.mutateAsync(args)}
        />
      )}
    </Sheet>
  )
}

function ExpenseForm({
  initial,
  expenseId,
  layout,
  focusAmount,
  plannedSummary,
  roomOptions,
  memberOptions,
  rooms,
  categories,
  expenses,
  projectBudget,
  onCreated,
  onClose,
  registerCloseHandler,
  createExpense,
  updateExpense,
  createCategory,
}: {
  initial: ExpenseFormData
  expenseId: string | null
  layout: FormLayout
  focusAmount: boolean
  plannedSummary: {
    description: string
    estimate: number
    qtyHint: string | null
  } | null
  roomOptions: { value: string; label: string }[]
  memberOptions: { value: string; label: string }[]
  rooms: { id: string; name: string; budget: number }[]
  categories: { id: string; name: string }[]
  expenses: Expense[]
  projectBudget: number
  onCreated: (expense: LocalExpense) => void
  onClose: () => void
  registerCloseHandler: (fn: () => void) => void
  createExpense: (form: ExpenseFormData) => Promise<LocalExpense>
  updateExpense: (args: {
    id: string
    form: ExpenseFormData
    quiet?: boolean
  }) => Promise<unknown>
  createCategory: (name: string) => Promise<{ id: string }>
}) {
  const lockedStatus: ExpenseStatus = layout === 'plan' ? 'planned' : 'purchased'
  const isBuyLike = layout === 'buy' || layout === 'convert'
  const [form, setForm] = useState<ExpenseFormData>({
    ...initial,
    status: lockedStatus,
  })
  const [savedId, setSavedId] = useState<string | null>(expenseId)
  const [showMore, setShowMore] = useState(false)
  const [showDiscount, setShowDiscount] = useState(
    !!(initial.discount_percent || initial.discount_amount),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const formRef = useRef(form)
  const savedIdRef = useRef(savedId)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const creatingRef = useRef(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const initialCategoryName =
    categories.find((c) => c.id === initial.category_id)?.name ?? ''
  const [categoryDraft, setCategoryDraft] = useState(initialCategoryName)
  const categoryDraftRef = useRef(categoryDraft)

  formRef.current = form
  savedIdRef.current = savedId
  categoryDraftRef.current = categoryDraft

  useEffect(() => {
    if (focusAmount) amountRef.current?.focus()
  }, [focusAmount])

  const persist = async (nextForm: ExpenseFormData, id: string | null) => {
    const locked: ExpenseFormData = {
      ...nextForm,
      status: lockedStatus,
    }
    if (!isMeaningful(locked)) return id
    setSaveState('saving')
    try {
      const categoryName = categoryDraftRef.current.trim()
      if (categoryName && !locked.category_id) {
        const cat = await createCategory(categoryName)
        locked.category_id = cat.id
        formRef.current = { ...formRef.current, category_id: cat.id }
        setForm((f) => ({ ...f, category_id: cat.id }))
      }
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
    if (isMeaningful(current)) {
      await persist(current, savedIdRef.current)
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

  const others = expenses.filter((e) => e.id !== savedId && !e.deleted_at)
  const room = rooms.find((r) => r.id === form.room_id)
  const scopeBudget = room && room.budget > 0 ? room.budget : projectBudget
  const scopeExpenses = room ? others.filter((e) => e.room_id === room.id) : others
  const remaining = scopeBudget
    ? budgetRemaining(scopeBudget, sumPaidExpenses(scopeExpenses), sumPlannedExpenses(scopeExpenses))
    : 0
  const scopeName = room?.name.toLowerCase() ?? 'prosjektet'
  const afford =
    scopeBudget > 0 ? affordSentence({ amount: total, remaining, scope: scopeName }) : null

  const roomName = rooms.find((r) => r.id === form.room_id)?.name
  const payerName = memberOptions.find((m) => m.value === form.who_paid)?.label
  const defaultsHint = isBuyLike
    ? [form.supplier.trim() || null, roomName, payerName].filter(Boolean).join(' · ')
    : ''

  const descriptionSuggestions = uniqueSuggestions(
    expenses.map((e) => (e.description === 'Uten tittel' ? '' : e.description)),
  )
  const shopSuggestions = uniqueSuggestions(expenses.map((e) => e.supplier))
  const categorySuggestions = uniqueSuggestions(categories.map((c) => c.name))

  const setCategoryFromName = (name: string) => {
    setCategoryDraft(name)
    const match = categories.find((c) => normalizeSuggest(c.name) === normalizeSuggest(name))
    update({ category_id: match?.id ?? null })
  }

  const saveLabel =
    saveState === 'saving' ? 'Lagrer…' : saveState === 'saved' ? 'Lagret' : 'Endringer lagres automatisk'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void flushAndClose()
      }}
      className="space-y-4 pb-16"
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
        <SuggestInput
          label="Hva"
          value={form.description === 'Uten tittel' ? '' : form.description}
          onChange={(description) => update({ description })}
          suggestions={descriptionSuggestions}
          placeholder={layout === 'plan' ? 'F.eks. Parkett eik' : 'Hva kjøpte du?'}
          autoFocus={!focusAmount}
        />
      )}

      {layout === 'plan' && (
        <Select
          label="Rom"
          value={form.room_id ?? ''}
          onChange={(e) => update({ room_id: e.target.value || null })}
          options={roomOptions}
          placeholder="Velg rom"
        />
      )}

      {isBuyLike ? (
        <MoneyInput
          ref={amountRef}
          label="Beløp"
          value={total}
          autoFocus={focusAmount}
          onChange={(amount) =>
            update({
              quantity: 1,
              unit: form.unit || 'stk',
              unit_price: amount,
              total_override: null,
            })
          }
        />
      ) : (
        <QtyPriceFields form={form} priceLabel="Pris/enhet" onUpdate={update} />
      )}

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

      {afford && <p className="text-sm text-muted">{afford}</p>}

      {layout === 'plan' && (
        <div className="space-y-4">
          <SuggestInput
            label="Butikk"
            value={form.supplier}
            onChange={(supplier) => update({ supplier })}
            suggestions={shopSuggestions}
            placeholder="F.eks. Byggmakker"
          />
          <SuggestInput
            label="Kategori"
            value={categoryDraft}
            onChange={setCategoryFromName}
            suggestions={categorySuggestions}
            placeholder="F.eks. Materialer"
          />
        </div>
      )}

      {defaultsHint && (
        <p className="text-xs text-muted">{defaultsHint}</p>
      )}

      <Button type="submit" size="lg" className="w-full">
        Ferdig
      </Button>

      {isBuyLike && (
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-2 text-sm text-primary font-medium"
      >
        {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Mer
      </button>
      )}

      {isBuyLike && showMore && (
        <div className="space-y-4 pt-1">
          <SuggestInput
            label="Butikk"
            value={form.supplier}
            onChange={(supplier) => update({ supplier })}
            suggestions={shopSuggestions}
            placeholder="F.eks. Byggmakker"
          />

          <Select
            label="Betalt av"
            value={form.who_paid}
            onChange={(e) => update({ who_paid: e.target.value })}
            options={memberOptions}
            placeholder="Velg person"
          />

          <Select
            label="Rom"
            value={form.room_id ?? ''}
            onChange={(e) => update({ room_id: e.target.value || null })}
            options={roomOptions}
            placeholder="Velg rom"
          />

          <SuggestInput
            label="Kategori"
            value={categoryDraft}
            onChange={setCategoryFromName}
            suggestions={categorySuggestions}
            placeholder="F.eks. Materialer"
          />

          <QtyPriceFields form={form} priceLabel="Pris/enhet" onUpdate={update} />

          {layout === 'buy' && (
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (timerRef.current) {
                    clearTimeout(timerRef.current)
                    timerRef.current = null
                  }
                  const current: ExpenseFormData = {
                    ...formRef.current,
                    status: 'planned',
                    who_paid: '',
                  }
                  const id = savedIdRef.current
                  if (id) {
                    await updateExpense({ id, form: current })
                    toast.success('Satt tilbake til planlagt')
                  } else if (isMeaningful(current)) {
                    await createExpense(current)
                    toast.success('Satt tilbake til planlagt')
                  }
                  onClose()
                })()
              }}
              className="w-full text-sm text-muted font-medium py-2"
            >
              Sett tilbake til planlagt
            </button>
          )}

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
                inputMode="decimal"
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
                inputMode="decimal"
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

          {discount > 0 && (
            <p className="text-sm text-emerald-700">Rabatt −{formatNOK(discount)}</p>
          )}

          {isBuyLike && (
            <Input
              label="Dato"
              type="date"
              value={form.expense_date}
              onChange={(e) => update({ expense_date: e.target.value })}
            />
          )}
        </div>
      )}
    </form>
  )
}
