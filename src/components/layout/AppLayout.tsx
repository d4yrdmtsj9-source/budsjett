import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { FAB } from './FAB'
import { ExpenseSheet } from '@/components/expense/ExpenseSheet'

export function AppLayout() {
  return (
    <div className="min-h-dvh pb-28">
      <main className="mx-auto max-w-lg px-4 pt-4 safe-top">
        <Outlet />
      </main>
      <FAB />
      <BottomNav />
      <ExpenseSheet />
    </div>
  )
}
