'use client'

// src/app/dashboard/staff/_components/ApptCard.tsx
// Extracted from StaffDashboardClient.tsx — no logic changes.

import { useState } from 'react'
import { fmt12, STATUS_CONFIG, SOURCE_LABEL, type QueueItem, type OrgProp, type ApptStatus } from './utils'

// ── OPD Card (print) ─────────────────────────────────────────
function OPDCard({ appt, org }: { appt: QueueItem; org: OrgProp }) {
  const patient = appt.patients?.users
  const doctor = appt.doctor_organizations?.doctors
  const fee = appt.doctor_organizations?.consultation_fee ?? 0
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=380,height=600')
    if (!w) return
    w.document.write(`
      <html><head><title>OPD Card</title>
      <style>
        body { font-family: sans-serif; padding: 16px; font-size: 12px; color: #111; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .label { color: #666; }
        hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
        .big { font-size: 28px; font-weight: 700; text-align: center; color: #006EFF; }
      </style></head><body>
      <h1>${org.name}</h1>
      <div class="label">${org.city}</div>
      <hr/>
      <div class="big">Q ${appt.queue_number ?? '--'}</div>
      <hr/>
      <div class="row"><span class="label">Patient</span><span>${patient?.full_name ?? ''}</span></div>
      <div class="row"><span class="label">Phone</span><span>${patient?.phone ?? ''}</span></div>
      <div class="row"><span class="label">Doctor</span><span>${doctor?.full_name ?? ''}</span></div>
      <div class="row"><span class="label">Date</span><span>${appt.appt_date}</span></div>
      <div class="row"><span class="label">Slot</span><span>${fmt12(appt.slot_start)} – ${fmt12(appt.slot_end)}</span></div>
      <div class="row"><span class="label">Source</span><span>${SOURCE_LABEL[appt.source] ?? appt.source}</span></div>
      <hr/>
      <div class="row"><span class="label">Consultation Fee</span><span>₹${fee}</span></div>
      <hr/>
      ${appt.patient_notes ? `<div class="label">Notes: ${appt.patient_notes}</div>` : ''}
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    w.document.close()
  }
  return (
    <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-medium text-[#006EFF] hover:text-blue-800 transition">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      OPD Card
    </button>
  )
}

// ── Invoice (print) ──────────────────────────────────────────
function InvoiceButton({ appt, org }: { appt: QueueItem; org: OrgProp }) {
  const patient = appt.patients?.users
  const doctor = appt.doctor_organizations?.doctors
  const fee = appt.doctor_organizations?.consultation_fee ?? 0
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=420,height=600')
    if (!w) return
    w.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: sans-serif; padding: 20px; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { text-align: left; background: #f3f4f6; padding: 6px 8px; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
        .total { font-size: 15px; font-weight: 700; }
        .right { text-align: right; }
        .label { color: #666; }
      </style></head><body>
      <h1>${org.name}</h1>
      <div class="sub">${org.city} | Invoice #${appt.id.slice(0, 8).toUpperCase()}</div>
      <div class="label">Patient: <strong>${patient?.full_name ?? ''}</strong></div>
      <div class="label">Phone: ${patient?.phone ?? ''}</div>
      <div class="label">Doctor: ${doctor?.full_name ?? ''}</div>
      <div class="label">Date: ${appt.appt_date} | Slot: ${fmt12(appt.slot_start)}</div>
      <table>
        <tr><th>Description</th><th class="right">Amount</th></tr>
        <tr><td>Consultation Fee</td><td class="right">₹${fee}</td></tr>
      </table>
      <div class="right total">Total: ₹${fee}</div>
      <br/><div class="label" style="font-size:10px">Thank you. Get well soon.</div>
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    w.document.close()
  }
  return (
    <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Invoice
    </button>
  )
}

// ── Appointment Card ─────────────────────────────────────────
export function ApptCard({
  appt,
  org,
  onAction,
  onEdit,
  isPending,
}: {
  appt: QueueItem
  org: OrgProp
  onAction: (id: string, action: string) => void
  onEdit: (appt: QueueItem) => void
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const patient = appt.patients?.users
  const doctor = appt.doctor_organizations?.doctors
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.BOOKED

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-4 pb-3 flex items-start gap-3 text-left"
      >
        {/* Queue number badge */}
        <div className="mt-0.5 min-w-[36px] h-9 rounded-xl bg-[#006EFF]/10 flex items-center justify-center">
          <span className="text-xs font-bold text-[#006EFF]">
            {appt.queue_number ? `#${appt.queue_number}` : '--'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[#1A1A2E] text-sm leading-tight">{patient?.full_name}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {SOURCE_LABEL[appt.source] ?? appt.source}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {fmt12(appt.slot_start)}
            {doctor && <span className="text-gray-400"> · {doctor.full_name}</span>}
          </p>
          {patient?.phone && (
            <a
              href={`tel:${patient.phone}`}
              onClick={e => e.stopPropagation()}
              className="text-xs text-[#006EFF] mt-0.5 block"
            >
              {patient.phone}
            </a>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-gray-300 mt-1 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Notes */}
      {appt.patient_notes && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 italic">"{appt.patient_notes}"</p>
        </div>
      )}

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-3">
          {/* Print row */}
          <div className="flex gap-4">
            <OPDCard appt={appt} org={org} />
            <InvoiceButton appt={appt} org={org} />
          </div>

          {/* Action buttons by status */}
          <div className="flex gap-2 flex-wrap">
            {appt.status === 'BOOKED' && (
              <>
                <button
                  onClick={() => onAction(appt.id, 'check-in')}
                  disabled={isPending}
                  className="flex-1 text-xs font-medium bg-teal-500 text-white rounded-xl py-2.5 hover:bg-teal-600 transition disabled:opacity-50"
                >
                  ✓ Check In / Arrived
                </button>
                <button
                  onClick={() => onEdit(appt)}
                  disabled={isPending}
                  className="px-3 text-xs font-medium bg-gray-100 text-gray-600 rounded-xl py-2.5 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onAction(appt.id, 'cancel')}
                  disabled={isPending}
                  className="px-3 text-xs font-medium bg-red-50 text-red-500 rounded-xl py-2.5 hover:bg-red-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            {appt.status === 'CHECKED_IN' && (
              <>
                <button
                  onClick={() => onAction(appt.id, 'advance')}
                  disabled={isPending}
                  className="flex-1 text-xs font-medium bg-amber-500 text-white rounded-xl py-2.5 hover:bg-amber-600 transition disabled:opacity-50"
                >
                  → Send to Doctor
                </button>
                <button
                  onClick={() => onAction(appt.id, 'no-show')}
                  disabled={isPending}
                  className="px-3 text-xs font-medium bg-gray-100 text-gray-500 rounded-xl py-2.5 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  No Show
                </button>
              </>
            )}
            {appt.status === 'IN_PROGRESS' && (
              <button
                onClick={() => onAction(appt.id, 'complete')}
                disabled={isPending}
                className="flex-1 text-xs font-medium bg-green-500 text-white rounded-xl py-2.5 hover:bg-green-600 transition disabled:opacity-50"
              >
                ✓ Mark Completed
              </button>
            )}
            {(appt.status === 'COMPLETED' || appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') && (
              <p className="text-xs text-gray-400 py-1">No further actions available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}