import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Is It Ready?</h1>
        <p className="text-xl text-slate-400 mb-8">Modern Tailor Management System</p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/auth/login"
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Login to Shop
          </Link>
          <Link 
            href="/auth/signup"
            className="px-8 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
          >
            Register Shop
          </Link>
        </div>
      </div>
    </div>
  )
}