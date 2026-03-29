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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the resource details below.'
              : 'Fill in the details to add a new campus resource.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Resource Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Lab Room A3"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)} required>
                <SelectTrigger className="mt-1.5">
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
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => updateField('capacity', e.target.value)}
                placeholder="e.g. 50"
                className="mt-1.5"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Block A, Floor 3"
                required
                className="mt-1.5"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the resource..."
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="availabilityStart">Available From</Label>
              <Input
                id="availabilityStart"
                type="time"
                value={form.availabilityStart}
                onChange={(e) => updateField('availabilityStart', e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="availabilityEnd">Available Until</Label>
              <Input
                id="availabilityEnd"
                type="time"
                value={form.availabilityEnd}
                onChange={(e) => updateField('availabilityEnd', e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="mt-1.5">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
