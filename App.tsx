import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import { Auth } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import Alerts from './pages/Alerts'
import Network from './pages/Network'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import AdvancedScanner from './pages/AdvancedScanner' // استيراد الصفحة الجديدة
import { useStore } from './store/useStore'

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('theme') === 'dark' || 
           window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  
  const { token } = useStore()

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)

  return (
    <LanguageProvider>
      <Router>
        {token ? (
          <MainLayout isDark={isDark} onToggleTheme={toggleTheme}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route 
                path="/devices" 
                element={
                  <ProtectedRoute>
                    <Devices />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/alerts" 
                element={
                  <ProtectedRoute>
                    <Alerts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/network" 
                element={
                  <ProtectedRoute>
                    <Network />
                  </ProtectedRoute>
                } 
              />
              
              {/* مسح Advanced Scanner الجديد */}
              <Route 
                path="/advanced-scanner" 
                element={
                  <ProtectedRoute>
                    <AdvancedScanner />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
              } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </MainLayout>
        ) : (
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        )}
      </Router>
    </LanguageProvider>
  )
}