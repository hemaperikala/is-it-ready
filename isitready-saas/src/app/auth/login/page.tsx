'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // Prevents the page from refreshing
    setLoading(true)

    // This is the actual magic that logs the tailor in
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Login failed: " + error.message) // Shows error if password is wrong
    } else {
      router.push('/dashboard') // Sends them to the dashboard if successful
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Login to Shop</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="Email" required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500"
          />
          <input 
            type="password" placeholder="Password" required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login Now'}
          </button>
        </form>
      </div>
    </div>
  )
}