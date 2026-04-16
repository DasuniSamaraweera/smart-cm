import { BookOpen, Building2, FlaskConical, Laptop, MonitorPlay, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

const resourceTypeCards = [
  {
    key: 'electronic-equipment',
    title: 'Electronic equipment',
    description: 'Computing devices and AV equipment used across campus services.',
    icon: Laptop,
    value: 'Electronic equipment',
    tone: 'from-sky-500/15 to-blue-500/10',
  },
  {
    key: 'facilities-locations',
    title: 'Facilities (Locations)',
    description: 'Physical spaces and locations available for university use.',
    icon: Building2,
    value: 'Facilities (Locations)',
    tone: 'from-cyan-500/15 to-teal-500/10',
  },
  {
    key: 'study-materials',
    title: 'Study materials',
    description: 'Books, journals, and learning materials available to users.',
    icon: BookOpen,
    value: 'Study materials',
    tone: 'from-emerald-500/15 to-green-500/10',
  },
  {
    key: 'multimedia-resources',
    title: 'Multimedia resources',
    description: 'Streaming and multimedia assets for learning and teaching.',
    icon: MonitorPlay,
    value: 'Multimedia resources',
    tone: 'from-violet-500/15 to-indigo-500/10',
  },
  {
    key: 'laboratory-resources',
    title: 'Laboratory resources',
    description: 'Lab spaces and specialized instruments for practical work.',
    icon: FlaskConical,
    value: 'Laboratory resources',
    tone: 'from-amber-500/15 to-orange-500/10',
  },
  {
    key: 'shared-utilities',
    title: 'Shared utilities',
    description: 'Shared facilities and services used by multiple groups.',
    icon: Wrench,
    value: 'Shared utilities',
    tone: 'from-rose-500/15 to-pink-500/10',
  },
]

export default function ResourceTypesPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Resource Catalogue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Choose Resource Type</h1>
          <p className="mt-1 text-sm text-slate-600">Select one category to continue.</p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => navigate('/resources/new')}
          >
            Add New Resource
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resourceTypeCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.key} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className={`rounded-2xl bg-gradient-to-br p-6 ${card.tone}`}>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{card.description}</p>
                <Button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => navigate(`/resources/new?resourceType=${encodeURIComponent(card.value)}`)}
                >
                  Open {card.title}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}