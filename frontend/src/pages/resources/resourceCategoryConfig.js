import { BookOpen, Building2, CircleEllipsis, FlaskConical, Laptop, MonitorPlay, Wrench } from 'lucide-react'

export const resourceTypeCards = [
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
  {
    key: 'other',
    title: 'Other',
    description: 'Other resources that do not fit predefined categories.',
    icon: CircleEllipsis,
    value: 'Other',
    tone: 'from-slate-500/15 to-zinc-500/10',
  },
]

export function getResourceCategoryByKey(categoryKey) {
  return resourceTypeCards.find((card) => card.key === categoryKey) || null
}
