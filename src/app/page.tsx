import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatStat } from '@/components/site/utils'

import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Hero from './_components/Hero'
import ChooseYourCare from './_components/ChooseYourCare'
import PopularSpecialties from './_components/PopularSpecialties'
import PrimeSection from './_components/PrimeSection'
import FeaturedLists, { type FeaturedDoctor, type FeaturedOrg } from './_components/FeaturedLists'
import WhyChooseUs from './_components/WhyChooseUs'
import AppDownloadCTA from './_components/AppDownloadCTA'

export const metadata: Metadata = {
  title: 'YesOPD — Book Doctor Appointments, Clinics & Hospitals',
  description:
    'Book appointments, consult doctors online, find clinics & hospitals near you, all in one place.',
}

// Note: createClient() reads cookies() internally, which opts this route
// into dynamic, per-request rendering in the App Router — so it always
// reflects current data and current auth state.

export default async function HomePage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [
    { data: { user } },
    specializationsRes,
    citiesRes,
    topDoctorsRes,
    clinicsRes,
    hospitalsRes,
    patientCountRes,
    doctorCountRes,
  ] = await Promise.all([
    supabase.auth.getUser(),

    supabase
      .from('specializations')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('organizations')
      .select('city')
      .eq('status', 'ACTIVE'),

    supabase
      .from('doctor_organizations')
      .select(`
        id,
        doctors!inner ( id, full_name, qualification, experience_yrs, photo_url, status, is_approved )
      `)
      .eq('is_active', true)
      .eq('doctors.status', 'ACTIVE')
      .eq('doctors.is_approved', true)
      .order('experience_yrs', { foreignTable: 'doctors', ascending: false })
      .limit(3),

    supabase
      .from('organizations')
      .select('id, name, city, logo_url')
      .eq('status', 'ACTIVE')
      .eq('org_type', 'CLINIC')
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('organizations')
      .select('id, name, city, logo_url')
      .eq('status', 'ACTIVE')
      .eq('org_type', 'HOSPITAL')
      .order('created_at', { ascending: false })
      .limit(3),

    // Aggregate counts only (no rows returned) — routed through the admin
    // client because `patients` carries PII and RLS likely restricts reads
    // to the patient themself, which would silently zero out this count for
    // an anonymous visitor. Same rationale already used in
    // src/app/actions/queue.ts for staff-side queue reads.
    admin.from('patients').select('*', { count: 'exact', head: true }),
    admin
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
      .eq('is_approved', true),
  ])

  const specializations = specializationsRes.data ?? []

  const cities = Array.from(
    new Set((citiesRes.data ?? []).map(r => r.city).filter(Boolean))
  ).sort()

  const topDoctors: FeaturedDoctor[] = (topDoctorsRes.data ?? []).map((row: any) => {
    const doc = Array.isArray(row.doctors) ? row.doctors[0] : row.doctors
    return {
      doctor_org_id: row.id,
      full_name: doc?.full_name ?? 'Doctor',
      qualification: doc?.qualification ?? null,
      experience_yrs: doc?.experience_yrs ?? 0,
      photo_url: doc?.photo_url ?? null,
    }
  })

  const clinics: FeaturedOrg[] = clinicsRes.data ?? []
  const hospitals: FeaturedOrg[] = hospitalsRes.data ?? []

  const patientCount = formatStat(patientCountRes.count ?? 0)
  const doctorCount = formatStat(doctorCountRes.count ?? 0)

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <Header cities={cities} isAuthenticated={!!user} />
      <Hero
        specializations={specializations}
        cities={cities}
        patientCount={patientCount}
        doctorCount={doctorCount}
      />
      <ChooseYourCare />
      <PopularSpecialties specializations={specializations} />
      <PrimeSection />
      <FeaturedLists doctors={topDoctors} clinics={clinics} hospitals={hospitals} />
      <WhyChooseUs />
      <AppDownloadCTA />
      <Footer />
    </main>
  )
}