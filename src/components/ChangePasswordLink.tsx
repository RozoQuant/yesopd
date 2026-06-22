import Link from 'next/link'

export default function ChangePasswordLink() {
  return (
    <Link
      href="/account/change-password"
      title="Change Password"
      className="text-gray-400 hover:text-gray-600 transition p-1"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </Link>
  )
}