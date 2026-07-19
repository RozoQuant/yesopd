import { ShieldCheckIcon, LockIcon, FileTextIcon, TruckIcon, StethoscopeIcon } from '@/components/site/icons'

const ITEMS = [
  { icon: StethoscopeIcon, title: 'Verified Doctors', desc: 'Experienced & trusted healthcare professionals' },
  { icon: LockIcon, title: 'Secure & Private', desc: 'Your data is safe and confidential' },
  { icon: FileTextIcon, title: 'Digital Records', desc: 'Access your appointment history anytime' },
  { icon: FileTextIcon, title: 'Smart Prescription', desc: 'Digital prescriptions & medical records', comingSoon: true },
  { icon: TruckIcon, title: 'Medicine Assistance', desc: 'Find medicines & get delivery at home', comingSoon: true },
  { icon: ShieldCheckIcon, title: 'Home Delivery', desc: 'Fast & reliable delivery to your doorstep', comingSoon: true },
]

export default function WhyChooseUs() {
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-bold text-[#1A1A2E] text-center mb-8">Why Choose YesOPD?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ITEMS.map(item => (
            <div key={item.title} className="flex gap-3.5">
              <span className="w-11 h-11 rounded-xl bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] shrink-0">
                <item.icon className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-[#1A1A2E] flex items-center gap-2">
                  {item.title}
                  {item.comingSoon && (
                    <span className="text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      Coming soon
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}