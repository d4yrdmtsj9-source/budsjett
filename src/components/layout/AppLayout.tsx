import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { FAB } from './FAB'
import { ExpenseSheet } from '@/components/expense/ExpenseSheet'

export function AppLayout() {
  return (
    <>
      <main className="mx-auto max-w-lg px-4 pt-4 pb-40 safe-top">
        <Outlet />
      </main>
      <FAB />
      <BottomNav />
      <ExpenseSheet />
    </>
  )
}
