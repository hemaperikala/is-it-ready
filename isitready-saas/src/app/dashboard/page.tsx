'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
          <p className="text-slate-400 text-lg mb-8">
            Welcome, {user?.email}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-emerald-400 text-sm font-semibold mb-2">Total Orders</h3>
              <p className="text-white text-3xl font-bold">0</p>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-amber-400 text-sm font-semibold mb-2">In Progress</h3>
              <p className="text-white text-3xl font-bold">0</p>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-blue-400 text-sm font-semibold mb-2">Ready</h3>
              <p className="text-white text-3xl font-bold">0</p>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => {
                supabase.auth.signOut()
                window.location.href = '/auth/login'
              }}
              className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 