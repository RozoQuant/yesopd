'use client'

interface Props {
  org_id: string
  onClose: () => void
  onSaved: () => void
}

export default function AddStaffForm({
  org_id,
  onClose,
  onSaved,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1A1A2E]">
            Add Staff
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form className="px-6 py-5 space-y-4">
          <div>
            <label className="label">
              Full Name *
            </label>
            <input
              className="input"
              placeholder="Staff name"
            />
          </div>

          <div>
            <label className="label">
              Mobile Number *
            </label>
            <input
              className="input"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="label">
              Email (Optional)
            </label>
            <input
              className="input"
              placeholder="staff@example.com"
            />
          </div>

          <div>
            <label className="label">
              Designation *
            </label>

            <select className="input">
              <option>RECEPTIONIST</option>
              <option>CABIN_ATTENDANT</option>
              <option>NURSE</option>
              <option>OTHER</option>
            </select>
          </div>

          <button
            type="button"
            className="w-full bg-[#006EFF] text-white rounded-xl py-3 text-sm font-semibold"
          >
            Add Staff
          </button>
        </form>
      </div>

      <style jsx>{`
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
          background: #F9FAFB;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
        }

        .input:focus {
          border-color: #006EFF;
          background: white;
          box-shadow: 0 0 0 3px rgba(0,110,255,0.1);
        }
      `}</style>
    </div>
  )
}