import Link from 'next/link'
import { BuildingIcon } from '@/components/site/icons'

export interface FeaturedDoctor {
  doctor_org_id: string
  full_name: string
  qualification: string | null
  experience_yrs: number
  photo_url: string | null
}

export interface FeaturedOrg {
  id: string
  name: string
  city: string
  logo_url: string | null
}

export default function FeaturedLists({
  doctors,
  clinics,
  hospitals,
}: {
  doctors: FeaturedDoctor[]
  clinics: FeaturedOrg[]
  hospitals: FeaturedOrg[]
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid md:grid-cols-3 gap-6">
        <ListCard id="doctors-list" title="Top Doctors" viewAllHref="#doctors">
          {doctors.length === 0 && <EmptyRow text="No doctors listed yet." />}
          {doctors.map(d => (
            <Link
              key={d.doctor_org_id}
              href={`/auth/login?next=${encodeURIComponent(`/dashboard/patient/book?doctor_org_id=${d.doctor_org_id}`)}`}
              className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
            >
              <div className="w-10 h-10 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] font-bold text-sm shrink-0 overflow-hidden">
                {d.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.photo_url} alt={d.full_name} className="w-full h-full object-cover" />
                ) : (
                  d.full_name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A2E] truncate">{d.full_name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {d.qualification ?? 'Doctor'}
                  {d.experience_yrs > 0 ? ` · ${d.experience_yrs}+ yrs exp` : ''}
                </p>
              </div>
              <span className="text-xs font-medium text-[#006EFF] shrink-0 border border-[#006EFF]/30 rounded-lg px-2.5 py-1">
                Book Now
              </span>
            </Link>
          ))}
        </ListCard>

        <ListCard id="clinics" title="Featured Clinics" viewAllHref="#clinics">
          {clinics.length === 0 && <EmptyRow text="No clinics listed yet." />}
          {clinics.map(c => <OrgRow key={c.id} org={c} />)}
        </ListCard>

        <ListCard id="hospitals" title="Top Hospitals" viewAllHref="#hospitals">
          {hospitals.length === 0 && <EmptyRow text="No hospitals listed yet." />}
          {hospitals.map(h => <OrgRow key={h.id} org={h} />)}
        </ListCard>
      </div>
    </section>
  )
}

function ListCard({ id, title, viewAllHref, children }: { id: string; title: string; viewAllHref: string; children: React.ReactNode }) {
  return (
    <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-[#1A1A2E]">{title}</h3>
        <a href={viewAllHref} className="text-xs font-medium text-[#006EFF] hover:underline">View All</a>
      </div>
      <div>{children}</div>
    </div>
  )
}

function OrgRow({ org }: { org: FeaturedOrg }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] shrink-0 overflow-hidden">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
        ) : (
          <BuildingIcon className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A2E] truncate">{org.name}</p>
        <p className="text-xs text-gray-400 truncate">{org.city}</p>
      </div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{text}</p>
}