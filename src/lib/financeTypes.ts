export interface Payment {
  id: string
  amount: number
  kind: 'payment' | 'refund'
  paid_by: string | null
  date: string
}
export interface RoomAllocation {
  room_id: string
  percent: number
}
export interface ReceiptRef {
  id: string
  name: string
  type: string
  size: number
}
/** Optional fields let v1 snapshots load without fabricating historical estimates. */
export interface FinanceFields {
  original_estimate?: number | null
  price_known?: boolean
  payments?: Payment[]
  due_date?: string | null
  product_url?: string | null
  alternative_group?: string | null
  budget_included?: boolean
  return_amount?: number
  allocations?: RoomAllocation[]
  receipts?: ReceiptRef[]
}
