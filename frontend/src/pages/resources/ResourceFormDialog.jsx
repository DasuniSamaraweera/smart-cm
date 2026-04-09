import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resourceApi } from '@/api/endpoints'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const emptyForm = {
  name: '',
  type: '',
  capacity: '',
  location: '',
  description: '',
  availabilityDate: '',
  availabilityStart: '',
  availabilityEnd: '',
  status: 'ACTIVE',
}

export default function ResourceFormDialog({ open, onOpenChange, resource }) {
  const queryClient = useQueryClient()
  const isEditing = !!resource
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (resource) {
      setForm({
        name: resource.name || '',
        type: resource.type || '',
        capacity: resource.capacity?.toString() || '',
        location: resource.location || '',
        description: resource.description || '',
        availabilityDate: resource.availabilityDate || '',
        availabilityStart: resource.availabilityStart || '',
        availabilityEnd: resource.availabilityEnd || '',
        status: resource.status || 'ACTIVE',
      })
    } else {
      setForm(emptyForm)
    }
  }, [resource, open])

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing ? resourceApi.update(resource.id, data) : resourceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success(isEditing ? 'Resource updated successfully' : 'Resource created successfully')
      onOpenChange(false)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Something went wrong'
      toast.error(msg)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      availabilityDate: form.availabilityDate || null,
      availabilityStart: form.availabilityStart || null,
      availabilityEnd: form.availabilityEnd || null,
    }
    mutation.mutate(payload)
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white">
        <DialogHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Resource Registry</p>
          <DialogTitle className="text-slate-900">{isEditing ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
          <DialogDescription className="text-slate-600">
            {isEditing
              ? 'Update the resource details below.'
              : 'Fill in the details to add a new campus resource.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
            <div className="col-span-2">
              <Label htmlFor="name" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Resource Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Lab Room A3"
                required
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)} required>
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LECTURE_HALL">Lecture Hall</SelectItem>
                  <SelectItem value="LAB">Lab</SelectItem>
                  <SelectItem value="MEETING_ROOM">Meeting Room</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capacity" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => updateField('capacity', e.target.value)}
                placeholder="e.g. 50"
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="location" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Block A, Floor 3"
                required
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the resource..."
                rows={3}
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="availabilityDate" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Availability Date</Label>
              <Input
                id="availabilityDate"
                type="date"
                value={form.availabilityDate}
                onChange={(e) => updateField('availabilityDate', e.target.value)}
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
                required
              />
            </div>

            <div>
              <Label htmlFor="availabilityStart" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Available From</Label>
              <Input
                id="availabilityStart"
                type="time"
                value={form.availabilityStart}
                onChange={(e) => updateField('availabilityStart', e.target.value)}
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <Label htmlFor="availabilityEnd" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Available Until</Label>
              <Input
                id="availabilityEnd"
                type="time"
                value={form.availabilityEnd}
                onChange={(e) => updateField('availabilityEnd', e.target.value)}
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl border-slate-300" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
