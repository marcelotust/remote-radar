import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from './contexts/UIContext'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/HomePage'
import { InboxPage } from './pages/InboxPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { ScrapingSourcesPage } from './pages/ScrapingSourcesPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient()

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <UIProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/scraping-sources" element={<ScrapingSourcesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wishlist" element={<Navigate to="/companies" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UIProvider>
  </QueryClientProvider>
)
