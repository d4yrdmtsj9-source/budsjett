import { useState } from 'react'
import {
  Plus,
  Trash2,
  Calculator,
  Paperclip,
  ExternalLink,
  Check,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Button } from '@/components/ui/Button'
import { useExpenseSheet } from '@/hooks/useExpenseSheet'
import { useExpenses } from '@/hooks/useExpenses'
import { useProject } from '@/hooks/useProject'
import { useRooms } from '@/hooks/useRooms'
import { useCategories } from '@/hooks/useCategories'
import { useAuth } from '@/hooks/useAuth'
import { calculateTotal, defaultExpenseForm, expenseToForm } from '@/lib/calc'
import {
  paymentsOf,
  knownPrice,
  paidAmount,
  netCost,
  materialQuantity,
  validateExpense,
  isPlanned,
  money,
} from '@/lib/finance'
import { uid, saveReceipt, readReceipt } from '@/lib/localStore'
import { formatNOK, todayISO } from '@/lib/format'
import type { Expense, ExpenseFormData, ExpenseStatus } from '@/lib/types'
import { EXPENSE_STATUS_LABELS, DEFAULT_UNITS } from '@/lib/types'

export function ExpenseSheet() {
  const ctx = useExpenseSheet()
  return (
    <Sheet
      open={ctx.isOpen}
      onClose={() => {
        if (window.confirm('Lukke skjemaet uten å lagre eventuelle endringer?'))
          ctx.close()
      }}
      title={ctx.editingExpense ? 'Rediger post' : 'Ny post'}
    >
      {ctx.isOpen && <ExpenseForm key={ctx.formInstanceId} />}
    </Sheet>
  )
}
function ExpenseForm() {
  const {
    editingExpense: editing,
    defaultRoomId,
    defaultStatus,
    mode,
    close,
    openNew,
  } = useExpenseSheet()
  const { createExpense, updateExpense, expenses } = useExpenses()
  const { project, rawProject, members } = useProject()
  const { memberId } = useAuth()
  const { data: rooms } = useRooms()
  const { data: categories } = useCategories()
  const [form, setForm] = useState<ExpenseFormData>(() => {
    const base = editing
      ? {
          ...expenseToForm(editing),
          payments: paymentsOf(editing),
          price_known: knownPrice(editing),
        }
      : {
          ...defaultExpenseForm(),
          room_id: defaultRoomId,
          status: defaultStatus,
          price_known: false,
          payments: [],
          budget_included: true,
        }
    if (mode === 'purchase' && editing)
      return {
        ...base,
        status: 'purchased',
        original_estimate:
          editing.original_estimate ??
          (knownPrice(editing) ? editing.total : null),
      }
    return base
  })
  const [more, setMore] = useState(false)
  const [quantityMode, setQuantityMode] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [area, setArea] = useState('')
  const [waste, setWaste] = useState('10')
  const [packSize, setPackSize] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [paidInFull, setPaidInFull] = useState(
    (!editing && defaultStatus === 'purchased') || mode === 'purchase',
  )
  const [payer, setPayer] = useState(memberId ?? '')
  const update = (patch: Partial<ExpenseFormData>) => {
    setForm((f) => ({ ...f, ...patch }))
    setError('')
  }
  const total = money(calculateTotal(form))
  const view = {
    ...form,
    id: editing?.id ?? '',
    total,
    created_at: '',
    project_id: '',
    deleted_at: null,
  } as Expense
  const effectivePaid =
    paidInFull && !isPlanned(form) ? netCost(view) : paidAmount(view)
  const estimate = editing?.original_estimate ?? form.original_estimate
  const changed =
    JSON.stringify(form) !==
    JSON.stringify(editing ? expenseToForm(editing) : defaultExpenseForm())
  const material = materialQuantity(
    Number(area),
    Number(waste),
    Number(packSize),
  )
  const memberOptions = [
    { value: 'common', label: 'Felleskonto' },
    ...members.map((m) => ({
      value: m.id,
      label: m.display_name ?? m.profile?.display_name ?? 'Person',
    })),
  ]
  const save = async (another = false) => {
    if (busy) return
    const next = {
      ...form,
      original_estimate: estimate,
      payments: [...(form.payments ?? [])],
    }
    if (paidInFull && !isPlanned(next)) {
      const remaining = money(netCost(view) - paidAmount(view))
      if (remaining > 0)
        next.payments.push({
          id: uid(),
          amount: remaining,
          kind: 'payment',
          paid_by: payer || null,
          date: todayISO(),
        })
    }
    const issue = validateExpense(next)
    if (issue) {
      setError(issue)
      return
    }
    setBusy(true)
    try {
      if (editing)
        await updateExpense.mutateAsync({ id: editing.id, form: next, expectedUpdatedAt: editing.updated_at })
      else await createExpense.mutateAsync(next)
      toast.success('Posten er lagret')
      if (another)
        openNew({
          roomId: form.room_id ?? undefined,
          status: isPlanned(form) ? 'planned' : 'purchased',
        })
      else close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lagre. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      {editing && <details className="work-details"><summary>Endringshistorikk</summary>
        {(rawProject?.expense_history ?? []).filter(h => h.expense.id === editing.id).slice().reverse().map(h => <div key={h.id} className="work-row"><span>{new Date(h.date).toLocaleString('nb-NO')} · {formatNOK(h.expense.total)} · betalt {formatNOK(paidAmount(h.expense as Expense))}</span><Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => {
          if (!window.confirm('Hente denne versjonen inn i skjemaet? Kontroller beløp og betalinger før du lagrer.')) return
          setForm({ ...expenseToForm(h.expense as Expense), payments: paymentsOf(h.expense as Expense) })
          setPaidInFull(false)
          setMore(true)
          setError('')
        }}>Hent versjon</Button></div>)}
        {!(rawProject?.expense_history ?? []).some(h => h.expense.id === editing.id) && <p className="text-xs text-muted">Ingen tidligere versjoner lagret.</p>}
      </details>}
      <fieldset disabled={busy} className="space-y-5">
        <Input
          label="Hva gjelder det?"
          placeholder="F.eks. Gulv til stuen"
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          required
          autoFocus={!editing}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Rom / område"
            value={form.room_id ?? ''}
            onChange={(e) => update({ room_id: e.target.value || null })}
            placeholder="Felles / uten rom"
            options={(rooms ?? []).map((r) => ({ value: r.id, label: r.name }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => {
              const status = e.target.value as ExpenseStatus
              update({ status })
              if (isPlanned({ status })) setPaidInFull(false)
            }}
            options={Object.entries(EXPENSE_STATUS_LABELS)
              .filter(([key]) => key !== 'paid')
              .map(([value, label]) => ({ value, label }))
              .concat(
                form.status === 'paid'
                  ? [{ value: 'paid', label: 'Betalt (tidligere)' }]
                  : [],
              )}
          />
        </div>
        <div className="form-amount">
          <MoneyInput
            label={
              isPlanned(form)
                ? 'Estimert totalpris'
                : 'Avtalt / faktisk totalpris'
            }
            value={total}
            onChange={(n) =>
              update({
                total_override: n,
                price_known: true,
                discount_percent: null,
                discount_amount: null,
              })
            }
          />
          <label className="check-label mt-3">
            <input
              type="checkbox"
              checked={form.price_known === false}
              onChange={(e) =>
                update({
                  price_known: !e.target.checked,
                  ...(e.target.checked ? { total_override: 0 } : {}),
                })
              }
            />{' '}
            Pris mangler ennå
          </label>
          <p className="text-xs text-muted mt-2">Inkludert mva.</p>
        </div>
        {estimate != null && (
          <div className="notice">
            <span>
              Opprinnelig estimat <strong>{formatNOK(estimate)}</strong>
            </span>
            <span
              className={
                netCost(view) > estimate ? 'text-destructive' : 'text-primary'
              }
            >
              {netCost(view) === estimate
                ? 'Som planlagt'
                : `${netCost(view) > estimate ? '+' : '−'}${formatNOK(Math.abs(netCost(view) - estimate))}`}
            </span>
          </div>
        )}
        {!isPlanned(form) && (
          <details className="form-section space-y-4" open={paidInFull || undefined}>
            <summary className="cursor-pointer text-sm">Betaling, forfall og levering</summary>
            <div className="section-heading">
              <h3>Betaling</h3>
              <span className="text-sm text-muted">
                {formatNOK(effectivePaid)} betalt netto
              </span>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={paidInFull}
                onChange={(e) => setPaidInFull(e.target.checked)}
              />{' '}
              Hele restbeløpet er betalt
            </label>
            {paidInFull && (
              <Select
                label="Betalt fra"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                options={memberOptions}
                placeholder="Velg betaler"
              />
            )}
            {!paidInFull && (
              <>
                {(form.payments ?? []).map((p, i) => (
                  <div className="payment-row space-y-3" key={p.id}>
                    <div className="flex justify-between items-center">
                      <span className="eyebrow">
                        {p.kind === 'refund' ? 'Refusjon' : 'Betaling'} {i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Fjern betaling ${i + 1}`}
                        onClick={() =>
                          update({
                            payments: form.payments?.filter(
                              (v) => v.id !== p.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <MoneyInput
                      label={`Beløp ${i + 1}`}
                      value={p.amount}
                      onChange={(amount) =>
                        update({
                          payments: form.payments?.map((v) =>
                            v.id === p.id ? { ...v, amount } : v,
                          ),
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label={`Betaler ${i + 1}`}
                        value={p.paid_by ?? ''}
                        placeholder="Ukjent"
                        options={memberOptions}
                        onChange={(e) =>
                          update({
                            payments: form.payments?.map((v) =>
                              v.id === p.id
                                ? { ...v, paid_by: e.target.value || null }
                                : v,
                            ),
                          })
                        }
                      />
                      <Input
                        label={`Dato ${i + 1}`}
                        type="date"
                        value={p.date}
                        onChange={(e) =>
                          update({
                            payments: form.payments?.map((v) =>
                              v.id === p.id
                                ? { ...v, date: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    update({
                      payments: [
                        ...(form.payments ?? []),
                        {
                          id: uid(),
                          amount: Math.max(
                            0,
                            money(netCost(view) - paidAmount(view)),
                          ),
                          kind: 'payment',
                          paid_by: memberId,
                          date: todayISO(),
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} /> Legg til delbetaling
                </Button>
              </>
            )}
            <details className="work-details"><summary>Betalingsplan</summary>
              <p className="text-xs text-muted">Fordel hele avtaleprisen på forfall. Registrerte betalinger trekkes fra tidligste forfall.</p>
              {!(form.payment_schedule?.length) && <Input label="Forfallsdato" type="date" value={form.due_date ?? ''} onChange={e => update({ due_date: e.target.value || null })} />}
              {(form.payment_schedule ?? []).map((row, index) => <div className="payment-row space-y-3" key={row.id}>
                <Input label={`Forfall ${index + 1}`} type="date" value={row.date} onChange={e => update({ payment_schedule: form.payment_schedule?.map(s => s.id === row.id ? { ...s, date: e.target.value } : s) })} />
                <MoneyInput label="Beløp" value={row.amount} onChange={value => update({ payment_schedule: form.payment_schedule?.map(s => s.id === row.id ? { ...s, amount: value } : s) })} />
                <Button type="button" variant="ghost" size="sm" onClick={() => update({ payment_schedule: form.payment_schedule?.filter(s => s.id !== row.id) })}>Fjern forfall</Button>
              </div>)}
              <Button type="button" variant="secondary" size="sm" onClick={() => update({ payment_schedule: [...(form.payment_schedule ?? []), { id: uid(), date: form.due_date ?? todayISO(), amount: Math.max(0, total - (form.payment_schedule ?? []).reduce((n,s) => n+s.amount, 0)), label: '' }] })}>Legg til forfall</Button>
            </details>
            <details className="work-details"><summary>Levering</summary>
              <Select label="Leveringsstatus" value={form.delivery_status ?? 'waiting'} onChange={e => update({ delivery_status: e.target.value as ExpenseFormData['delivery_status'] })} options={[{ value: 'waiting', label: 'Venter på levering' }, { value: 'received', label: 'Mottatt' }, { value: 'not_required', label: 'Krever ikke levering' }]} />
              <Input label="Forventet levering" type="date" value={form.delivery_date ?? ''} onChange={e => update({ delivery_date: e.target.value || null })} />
            </details>
          </details>
        )}
        <button
          type="button"
          className="disclosure"
          aria-expanded={quantityMode}
          onClick={() => setQuantityMode(!quantityMode)}
        >
          <Calculator size={18} /> Mengde, pakker og rabatt{' '}
          <ChevronDown size={16} />
        </button>
        {quantityMode && (
          <div className="form-section space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mengde"
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) =>
                  update({
                    quantity: Number(e.target.value),
                    total_override: null,
                    price_known: true,
                  })
                }
              />
              <Select
                label="Enhet"
                value={form.unit}
                options={DEFAULT_UNITS.map((u) => ({ value: u, label: u }))}
                onChange={(e) => update({ unit: e.target.value })}
              />
            </div>
            <MoneyInput
              label="Pris per enhet"
              value={form.unit_price}
              onChange={(n) =>
                update({
                  unit_price: n,
                  total_override: null,
                  price_known: true,
                })
              }
            />
            <Input
              label="Rabatt i prosent"
              type="number"
              min="0"
              max="100"
              step="any"
              value={form.discount_percent ?? ''}
              onChange={(e) =>
                update({
                  discount_percent: Number(e.target.value),
                  discount_amount: null,
                  total_override: null,
                })
              }
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCalcOpen(!calcOpen)}
            >
              Beregn materialbehov
            </Button>
            {calcOpen && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Areal m²"
                    type="number"
                    min="0"
                    step="any"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                  <Input
                    label="Svinn %"
                    type="number"
                    min="0"
                    step="any"
                    value={waste}
                    onChange={(e) => setWaste(e.target.value)}
                  />
                  <Input
                    label="m² / pakke"
                    type="number"
                    min="0"
                    step="any"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                  />
                </div>
                <p className="text-sm">
                  Behov: {material.required} m² ·{' '}
                  <strong>{material.packs} pakker</strong> ({material.purchased}{' '}
                  m²)
                </p>
                <Button
                  type="button"
                  disabled={
                    material.packs <= 0 ||
                    Number(area) <= 0 ||
                    Number(waste) < 0
                  }
                  onClick={() => {
                    update({
                      quantity: material.packs,
                      unit: 'pakke',
                      total_override: null,
                    })
                    setCalcOpen(false)
                    toast.message(
                      'Antall pakker lagt inn. Oppgi pris per pakke.',
                    )
                  }}
                >
                  Bruk antall pakker
                </Button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="disclosure"
          aria-expanded={more}
          onClick={() => setMore(!more)}
        >
          <Plus size={18} /> Butikk, tilbud, retur og dokumenter{' '}
          <ChevronDown size={16} />
        </button>
        {more && (
          <div className="form-section space-y-4">
            <Input
              label="Butikk / leverandør"
              placeholder="F.eks. IKEA"
              value={form.supplier}
              onChange={(e) => update({ supplier: e.target.value })}
            />
            <Select
              label="Kategori"
              value={form.category_id ?? ''}
              onChange={(e) => update({ category_id: e.target.value || null })}
              options={(categories ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="Ingen kategori"
            />
            <Input
              label="Produkt eller dokumentlenke"
              type="url"
              placeholder="https://"
              value={form.product_url ?? ''}
              onChange={(e) => update({ product_url: e.target.value })}
            />
            <label className="block text-sm font-medium">
              Notater
              <textarea
                className="mt-2 w-full rounded-xl border border-border p-3"
                rows={3}
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Mål, farge, leveringsavtale …"
              />
            </label>
            <div className="border-t border-border pt-4 space-y-3">
              <h3>Alternative tilbud</h3>
              <Input
                label="Sammenligningsgruppe"
                value={form.alternative_group ?? ''}
                placeholder="F.eks. Kjøkkeninnredning"
                onChange={(e) =>
                  update({ alternative_group: e.target.value || null })
                }
              />
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.budget_included !== false}
                  onChange={(e) =>
                    update({ budget_included: e.target.checked })
                  }
                />{' '}
                Ta med i budsjettet
              </label>
              <p className="text-xs text-muted">
                Bruk samme gruppenavn på tilbudene. Når du velger et tilbud, tas
                andre uforpliktende alternativer i gruppen ut av budsjettet.
              </p>
              {form.alternative_group &&
                expenses
                  .filter(
                    (e) =>
                      e.id !== editing?.id &&
                      e.alternative_group === form.alternative_group,
                  )
                  .map((e) => (
                    <p className="text-sm flex justify-between" key={e.id}>
                      <span>{e.supplier || e.description}</span>
                      <strong>{formatNOK(e.total)}</strong>
                    </p>
                  ))}
            </div>
            {!isPlanned(form) && (
              <div className="border-t border-border pt-4 space-y-3">
                <h3>Retur og refusjon</h3>
                <MoneyInput
                  label="Godkjent retur / prisavslag"
                  value={form.return_amount ?? 0}
                  onChange={(n) => {
                    update({ return_amount: n })
                    setPaidInFull(false)
                  }}
                />
                <p className="text-xs text-muted">
                  Reduserer forventet sluttkostnad. Registrer refusjonen når
                  pengene faktisk kommer tilbake.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    update({
                      payments: [
                        ...(form.payments ?? []),
                        {
                          id: uid(),
                          amount: Math.max(
                            0,
                            money(paidAmount(view) - netCost(view)),
                          ),
                          kind: 'refund',
                          paid_by: memberId,
                          date: todayISO(),
                        },
                      ],
                    })
                    setPaidInFull(false)
                  }}
                >
                  Registrer mottatt refusjon
                </Button>
              </div>
            )}
            <div className="border-t border-border pt-4 space-y-3">
              <h3>Fordel på flere rom</h3>
              <p className="text-xs text-muted">
                Valgfritt. La feltene være tomme for å bruke rommet øverst.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(rooms ?? []).map((r) => (
                  <Input
                    key={r.id}
                    label={`${r.name} %`}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={
                      form.allocations?.find((a) => a.room_id === r.id)
                        ?.percent ?? ''
                    }
                    onChange={(e) =>
                      update({
                        allocations: [
                          ...(form.allocations ?? []).filter(
                            (a) => a.room_id !== r.id,
                          ),
                          ...(Number(e.target.value) > 0
                            ? [
                                {
                                  room_id: r.id,
                                  percent: Number(e.target.value),
                                },
                              ]
                            : []),
                        ],
                      })
                    }
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <h3>Kvitteringer og dokumenter</h3>
              <p className="text-xs text-muted">
                Filer lagres på denne enheten. Bruk dokumentlenke for tilgang på
                begge telefoner. Sikkerhetskopien kan ta med lokale filer.
              </p>
              <label className="disclosure cursor-pointer">
                <Paperclip size={17} /> Legg ved bilde eller PDF
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 10 * 1024 * 1024) {
                      setError('Filen må være under 10 MB.')
                      return
                    }
                    try {
                      const id = uid()
                      await saveReceipt(id, file)
                      update({
                        receipts: [
                          ...(form.receipts ?? []),
                          {
                            id,
                            name: file.name,
                            type: file.type,
                            size: file.size,
                          },
                        ],
                      })
                    } catch {
                      setError('Kunne ikke lagre filen på enheten.')
                    }
                  }}
                />
              </label>
              {(form.receipts ?? []).map((r) => (
                <div key={r.id} className="flex justify-between gap-2">
                  <button
                    type="button"
                    className="text-primary text-sm flex items-center gap-2 min-w-0"
                    onClick={async () => {
                      const blob = await readReceipt(r.id)
                      if (!blob) {
                        toast.error(
                          'Originalfilen finnes på enheten der den ble lagt til.',
                        )
                        return
                      }
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = r.name
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 10000)
                    }}
                  >
                    <ExternalLink size={16} />
                    <span className="truncate">{r.name}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Fjern vedlegg ${r.name}`}
                    onClick={() =>
                      update({
                        receipts: form.receipts?.filter((v) => v.id !== r.id),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="space-y-2 pt-3 border-t border-border">
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          <Check size={18} />
          {busy ? 'Lagrer …' : 'Lagre post'}
        </Button>
        {!editing && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => void save(true)}
          >
            Lagre og legg til neste
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            if (!changed || window.confirm('Forkaste endringene i skjemaet?'))
              close()
          }}
        >
          Avbryt
        </Button>
      </div>
      {project && (
        <p className="text-xs text-muted text-center">
          Lagres i {project.name}
        </p>
      )}
    </form>
  )
}
