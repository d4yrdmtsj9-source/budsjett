import { useState } from 'react'
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
  type ExpenseFormData,
  type ExpenseStatus,
} from '@/lib/types'

export function ExpenseSheet() {
  const { isOpen, editingExpense, defaultRoomId, close } = useExpenseSheet()
  const { createExpense, updateExpense } = useExpenses()
  const { data: rooms } = useRooms()
  const { data: categories } = useCategories()
  const { members } = useProject()

  const isEditing = !!editingExpense

  const statusOptions = Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const roomOptions = (rooms ?? []).map((r) => ({ value: r.id, label: r.name }))
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))
  const memberOptions = members.map((m) => ({
    value: m.user_id,
    label: m.profile?.display_name ?? 'Ukjent',
  }))

  const initialForm = editingExpense
    ? expenseToForm(editingExpense)
    : { ...defaultExpenseForm(), room_id: defaultRoomId }

  const handleSubmit = async (form: ExpenseFormData, receiptFile: File | null) => {
    if (!form.description.trim()) {
      toast.error('Beskrivelse er påkrevd')
      return
    }

    try {
      if (isEditing && editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, form })
        toast.success('Utgift oppdatert')
      } else {
        const created = await createExpense.mutateAsync(form)
        if (receiptFile && created?.id) {
          await uploadReceipt(created.id, receiptFile)
        }
        toast.success('Utgift lagt til')
      }
      close()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={close}
      title={isEditing ? 'Rediger utgift' : 'Legg til utgift'}
    >
      {isOpen && (
        <ExpenseForm
          key={editingExpense?.id ?? defaultRoomId ?? 'new'}
          initial={initialForm}
          onSubmit={handleSubmit}
          isEditing={isEditing}
          roomOptions={roomOptions}
          categoryOptions={categoryOptions}
          memberOptions={memberOptions}
          statusOptions={statusOptions}
        />
      )}
    </Sheet>
  )
}

function ExpenseForm({
  initial,
  onSubmit,
  isEditing,
  roomOptions,
  categoryOptions,
  memberOptions,
  statusOptions,
}: {
  initial: ExpenseFormData
  onSubmit: (form: ExpenseFormData, receipt: File | null) => Promise<void>
  isEditing: boolean
  roomOptions: { value: string; label: string }[]
  categoryOptions: { value: string; label: string }[]
  memberOptions: { value: string; label: string }[]
  statusOptions: { value: string; label: string }[]
}) {
  const [form, setForm] = useState<ExpenseFormData>(initial)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDiscount, setShowDiscount] = useState(
    !!(initial.discount_percent || initial.discount_amount),
  )
  const [saving, setSaving] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const update = (patch: Partial<ExpenseFormData>) => setForm((f) => ({ ...f, ...patch }))

  const subtotal = calculateSubtotal(form.quantity, form.unit_price)
  const discount = calculateDiscount(subtotal, form.discount_percent, form.discount_amount)
  const total = calculateTotal(form)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form, receiptFile)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-6">
      <Input
        label="Beskrivelse"
        value={form.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="F.eks. Parkett eik"
        autoFocus
        required
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
          <Input
            label="Leverandør"
            value={form.supplier}
            onChange={(e) => update({ supplier: e.target.value })}
            placeholder="F.eks. Byggmakker"
          />
          <Input
            label="Dato"
            type="date"
            value={form.expense_date}
            onChange={(e) => update({ expense_date: e.target.value })}
          />
          <Select
            label="Betalt av"
            value={form.who_paid}
            onChange={(e) => update({ who_paid: e.target.value })}
            options={memberOptions}
            placeholder="Velg person"
          />
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
          {!isEditing && (
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
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving ? 'Lagrer...' : isEditing ? 'Oppdater utgift' : 'Legg til utgift'}
      </Button>
    </form>
  )
}
