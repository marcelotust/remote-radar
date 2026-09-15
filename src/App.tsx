import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { UIProvider } from './contexts/UIContext'
import { RequireAuth } from './components/RequireAuth/RequireAuth'
import { Layout } from './components/Layout/Layout'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { InboxPage } from './pages/InboxPage'
import { ScrapingSourcesPage } from './pages/ScrapingSourcesPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient()

export const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/scraping-sources" element={<ScrapingSourcesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </UIProvider>
    </QueryClientProvider>
  </AuthProvider>
)
