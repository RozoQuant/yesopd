import Link from 'next/link'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-3xl font-bold text-[#006EFF] tracking-tight">YES</span>
        <span className="text-3xl font-bold text-[#1A1A2E] tracking-tight">OPD</span>
        <p className="mt-1 text-sm text-gray-500">Book your OPD appointment online</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-semibold text-[#1A1A2E] mb-6">Sign in</h1>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="text-[#006EFF] font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}