import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { ProjectProvider } from '@/hooks/useProject'
import { ExpenseSheetProvider } from '@/hooks/useExpenseSheet'
import { AuthGate } from '@/pages/AuthPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { RoomDetailPage } from '@/pages/RoomDetailPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { SupplierDetailPage } from '@/pages/SupplierDetailPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { MoodboardPage } from '@/pages/MoodboardPage'
import { PlanningPage } from '@/pages/PlanningPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  const { resolved } = useTheme()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <ExpenseSheetProvider>
            <HashRouter>
              <AuthGate>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="rom" element={<RoomsPage />} />
                    <Route path="moodboard" element={<MoodboardPage />} />
                    <Route path="inspo" element={<LegacyInspoRedirect />} />
                    <Route path="planlegg" element={<PlanningPage />} />
                    <Route path="rom/:roomId" element={<RoomDetailPage />} />
                    <Route path="utgifter" element={<ExpensesPage />} />
                    <Route path="leverandorer" element={<SuppliersPage />} />
                    <Route
                      path="leverandorer/:name"
                      element={<SupplierDetailPage />}
                    />
                    <Route path="innstillinger" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthGate>
            </HashRouter>
            <Toaster
              theme={resolved}
              position="top-center"
              toastOptions={{
                className: 'font-body',
              }}
            />
          </ExpenseSheetProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function LegacyInspoRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/moodboard${search}`} replace />
}
