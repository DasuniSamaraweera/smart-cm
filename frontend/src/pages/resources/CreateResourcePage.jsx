import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { resourceApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const resourceTypeOptions = [
  { value: 'Electronic equipment', label: 'Electronic equipment' },
  { value: 'Facilities (Locations)', label: 'Facilities (Locations)' },
  { value: 'Study materials', label: 'Study materials' },
  { value: 'Multimedia resources', label: 'Multimedia resources' },
  { value: 'Laboratory resources', label: 'Laboratory resources' },
  { value: 'Shared utilities', label: 'Shared utilities' },
  { value: 'Other', label: 'Other' },
]

const subcategoryOptions = {
  'Electronic equipment': [
    'Laptops',
    'Desktop Computers',
    'Projectors',
    'Tablets / iPads',
    'Digital Cameras',
    'Microphones (wired/wireless)',
    'Speakers / Sound Systems',
    'Smart Boards / Interactive Displays',
    'Other',
  ],
  'Facilities (Locations)': [
    'Lecture Halls',
    'Auditorium',
    'Meeting Rooms',
    'Computer Labs',
    'Study Rooms',
    'Conference Rooms',
    'Seminar Halls',
    'Outdoor Event Grounds',
    'Other',
  ],
  'Study materials': [
    'Textbooks',
    'Reference Books',
    'Past Papers',
    'Lecture Notes (Digital/PDF)',
    'Research Papers / Journals',
    'E-books',
    'Course Modules',
    'Printed Handouts',
    'Exam Papers (Current / Unreleased)',
    'Marking Schemes & Answer Keys',
    'Confidential Course Materials (Draft Notes / Internal Content)',
    'Student Assessment Records & Grading Sheets',
    'Research Data Sets (Restricted / Ongoing Research)',
    'Other',
  ],
  'Multimedia resources': [
    'Educational Videos',
    'Recorded Lectures',
    'Webinars / Online Sessions',
    'Podcasts',
    'Documentaries',
    'Animation / Simulation Videos',
    'Virtual Reality (VR) Content',
    'Audio Books',
    'Other',
  ],
  'Laboratory resources': [
    'Microscopes',
    'Lab Computers (High-performance)',
    'Circuit Boards / Electronics Kits',
    'Chemical Lab Equipment Sets',
    '3D Printers',
    'Robotics Kits',
    'Measurement Instruments (e.g., multimeters)',
    'Safety Equipment (lab coats, goggles)',
    'Other',
  ],
  'Shared utilities': [
    'Printing Services / Printers',
    'Scanners',
    'Photocopy Machines',
    'High-speed Internet Access (Wi-Fi Hotspots)',
    'Charging Stations',
    'Lockers / Storage Units',
    'Shuttle / Transport Services',
    'Power Backup (Generators / UPS access)',
    'Other',
  ],
  Other: [
    'General',
  ],
}

function mapToBackendType(resourceType, subcategory) {
  if (resourceType === 'Facilities (Locations)') {
    if (subcategory === 'Lecture Halls' || subcategory === 'Auditorium' || subcategory === 'Seminar Halls') {
      return 'LECTURE_HALL'
    }
    if (subcategory === 'Computer Labs') return 'LAB'
    return 'MEETING_ROOM'
  }

  if (resourceType === 'Laboratory resources') {
    if (subcategory === 'Lab Computers (High-performance)') return 'LAB'
    return 'EQUIPMENT'
  }

  if (resourceType === 'Shared utilities') {
    if (subcategory === 'Shuttle / Transport Services' || subcategory === 'Power Backup (Generators / UPS access)') {
      return 'MEETING_ROOM'
    }
    return 'EQUIPMENT'
  }

  if (
    resourceType === 'Electronic equipment'
    || resourceType === 'Study materials'
    || resourceType === 'Multimedia resources'
    || resourceType === 'Other'
  ) {
    return 'EQUIPMENT'
  }

  return 'MEETING_ROOM'
}

export default function CreateResourcePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()

  const selectedType = searchParams.get('resourceType')
  const validTypeValues = resourceTypeOptions.map((option) => option.value)
  const initialResourceType = validTypeValues.includes(selectedType) ? selectedType : resourceTypeOptions[0].value
  const initialResourceSubcategory = (subcategoryOptions[initialResourceType] || [])[0] || ''

  const [form, setForm] = useState({
    resourceType: initialResourceType,
    resourceSubcategory: initialResourceSubcategory,
    resource: '',
    availableDate: '',
    availableFromTime: '',
    availableToTime: '',
    location: '',
    contactPerson: '',
    contactNumber: '',
    capacityOrAmount: '',
    status: 'ACTIVE',
  })

  const currentSubcategories = useMemo(
    () => subcategoryOptions[form.resourceType] || [],
    [form.resourceType],
  )

  const isEquipmentLike = useMemo(
    () => form.resourceType !== 'Facilities (Locations)',
    [form.resourceType],
  )

  const mutation = useMutation({
    mutationFn: (payload) => resourceApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource created successfully')
      navigate('/resources')
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create resource'
      toast.error(msg)
    },
  })

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleResourceTypeChange = (value) => {
    const nextSubcategories = subcategoryOptions[value] || []
    setForm((prev) => ({
      ...prev,
      resourceType: value,
      resourceSubcategory: nextSubcategories[0] || '',
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const payload = {
      name: form.resource,
      type: mapToBackendType(form.resourceType, form.resourceSubcategory),
      capacity: form.capacityOrAmount ? parseInt(form.capacityOrAmount, 10) : null,
      location: form.location,
      description: `Resource created via category form (${form.resourceSubcategory})`,
      resourceCategory: form.resourceType,
      resourceSubcategory: form.resourceSubcategory,
      contactPerson: form.contactPerson || null,
      contactNumber: form.contactNumber || null,
      availabilityDate: form.availableDate,
      availabilityStart: form.availableFromTime || null,
      availabilityEnd: form.availableToTime || null,
      status: form.status,
    }

    mutation.mutate(payload)
  }

  if (!isAdmin) {
    return (
      <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Access Restricted</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Only admins can add new resources.</p>
          <Button type="button" className="mt-4 rounded-xl" onClick={() => navigate('/resources')}>
            Back To Resources
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Resource Catalogue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Add New Resource</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create a resource with type, subcategory, availability, and stock details.</p>
        </div>
        <Button type="button" variant="outline" className="rounded-xl border-slate-300 dark:border-slate-600" onClick={() => navigate('/resources')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white dark:bg-gray-900 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Resource Type</Label>
              <Select value={form.resourceType} onValueChange={handleResourceTypeChange}>
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Resource Subcategory</Label>
              <Select value={form.resourceSubcategory} onValueChange={(v) => updateField('resourceSubcategory', v)}>
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="resource" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Resource</Label>
              <Input
                id="resource"
                value={form.resource}
                onChange={(e) => updateField('resource', e.target.value)}
                placeholder="Enter resource name"
                required
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="availableDate" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Available Date</Label>
              <Input
                id="availableDate"
                type="date"
                value={form.availableDate}
                onChange={(e) => updateField('availableDate', e.target.value)}
                required
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="availableFromTime" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Available From</Label>
              <Input
                id="availableFromTime"
                type="time"
                value={form.availableFromTime}
                onChange={(e) => updateField('availableFromTime', e.target.value)}
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="availableToTime" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Available To</Label>
              <Input
                id="availableToTime"
                type="time"
                value={form.availableToTime}
                onChange={(e) => updateField('availableToTime', e.target.value)}
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="location" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Block A, Floor 2"
                required
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="capacityOrAmount" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                {isEquipmentLike ? 'Amount' : 'Capacity'}
              </Label>
              <Input
                id="capacityOrAmount"
                type="number"
                min="1"
                value={form.capacityOrAmount}
                onChange={(e) => updateField('capacityOrAmount', e.target.value)}
                placeholder={isEquipmentLike ? 'e.g. 12' : 'e.g. 80'}
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contactPerson" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Contact Person</Label>
              <Input
                id="contactPerson"
                value={form.contactPerson}
                onChange={(e) => updateField('contactPerson', e.target.value)}
                placeholder="e.g. Facilities Manager"
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="contactNumber" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Contact Number</Label>
              <Input
                id="contactNumber"
                type="tel"
                value={form.contactNumber}
                onChange={(e) => updateField('contactNumber', e.target.value)}
                placeholder="e.g. +94 77 123 4567"
                className="mt-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-xl border-slate-300 dark:border-slate-600" onClick={() => navigate('/resources')}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Resource
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
