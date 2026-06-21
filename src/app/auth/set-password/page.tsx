import SetPasswordForm from './SetPasswordForm'

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to YesOPD</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create a password to activate your account
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <SetPasswordForm />
        </div>
      </div>
    </div>
  )
}