import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, supabaseMissing } from './lib/supabase'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChannelDetail from './pages/ChannelDetail'
import RichMenuEdit from './pages/RichMenuEdit'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (supabaseMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">設定錯誤</h1>
          <p className="text-gray-600">缺少環境變數 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY</p>
          <p className="text-gray-500 text-sm mt-2">請在 Netlify 環境變數中設定後重新部署</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={session ? <Navigate to="/dashboard" /> : <Register />} />
      <Route element={<ProtectedRoute session={session} />}>
        <Route element={<Layout session={session} />}>
          <Route path="/dashboard" element={<Dashboard session={session} />} />
          <Route path="/channels/:id" element={<ChannelDetail session={session} />} />
          <Route path="/channels/:id/richmenu/new" element={<RichMenuEdit session={session} />} />
          <Route path="/channels/:id/richmenu/:menuId" element={<RichMenuEdit session={session} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App
