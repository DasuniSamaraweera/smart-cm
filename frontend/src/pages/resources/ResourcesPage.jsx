import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { resourceApi } from '@/api/endpoints'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Monitor,
  FlaskConical,
  Presentation,
  Camera,
  CalendarPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import ResourceFormDialog from './ResourceFormDialog'
import FacilitiesAssistant from './FacilitiesAssistant'

const typeIcons = {
  LECTURE_HALL: Presentation,
  LAB: FlaskConical,
  MEETING_ROOM: Monitor,
  EQUIPMENT: Camera,
}

const typeLabels = {
  LECTURE_HALL: 'Lecture Hall',
  LAB: 'Lab',
  MEETING_ROOM: 'Meeting Room',
  EQUIPMENT: 'Equipment',
}

const resourceTypes = ['LECTURE_HALL', 'MEETING_ROOM', 'LAB', 'EQUIPMENT']

export default function ResourcesPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minCapacity, setMinCapacity] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState(null)

  const { data: allResources = [], isLoading } = useQuery({
    queryKey: ['resources', { search, status: statusFilter, minCapacity }],
    queryFn: () =>
      resourceApi
        .getAll({
          search: search || undefined,
          status: statusFilter || undefined,
          minCapacity: minCapacity ? Number(minCapacity) : undefined,
        })
        .then((res) => res.data),
  })

  const resources = selectedCategory
    ? allResources.filter((resource) => resource.type === selectedCategory)
    : allResources

  const applyAssistantFilters = (patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
      setSelectedCategory(patch.type || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
      setStatusFilter(patch.status || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'minCapacity')) {
      setMinCapacity(patch.minCapacity ? String(patch.minCapacity) : '')
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => resourceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource deleted successfully')
    },
    onError: () => toast.error('Failed to delete resource'),
  })

  const handleEdit = (resource) => {
    setEditingResource(resource)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingResource(null)
    setDialogOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleBookNow = (resource) => {
    const query = new URLSearchParams({
      resourceId: String(resource.id),
      resourceName: resource.name,
    })
    navigate(`/bookings?${query.toString()}`)
  }

  const resourceCounts = resourceTypes.reduce((acc, type) => {
    acc[type] = allResources.filter((resource) => resource.type === type).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facilities & Resources</h1>
          <p className="text-muted-foreground mt-1">
            Manage campus resources, halls, labs, rooms, and equipment.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
              placeholder="Min capacity"
              className="w-full sm:w-[140px]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resourceTypes.map((type) => {
          const Icon = typeIcons[type]
          const isSelected = selectedCategory === type

          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => setSelectedCategory(type)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{typeLabels[type]}</p>
                    <p className="text-2xl font-semibold mt-1">{resourceCounts[type] || 0}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedCategory && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {typeLabels[selectedCategory]} resources only
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCategory('')}>
            Show all resources
          </Button>
        </div>
      )}

      <FacilitiesAssistant resources={resources} onApplyFilters={applyAssistantFilters} />

      {/* Resource grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No resources found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search || selectedCategory || statusFilter || minCapacity
                ? 'Try adjusting your filters.'
                : isAdmin
                ? 'Get started by adding your first resource.'
                : 'No resources available yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const Icon = typeIcons[resource.type] || Building2
            return (
              <Card key={resource.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{resource.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {typeLabels[resource.type] || resource.type}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(resource)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(resource.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {resource.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {resource.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {resource.location}
                    </div>
                    {resource.capacity && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {resource.capacity}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <Badge variant={resource.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {resource.status === 'ACTIVE' ? 'Active' : 'Out of Service'}
                    </Badge>
                    {resource.availabilityDate && resource.availabilityStart && resource.availabilityEnd && (
                      <span className="text-xs text-muted-foreground">
                        {resource.availabilityDate} • {resource.availabilityStart} - {resource.availabilityEnd}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-2"
                    onClick={() => handleBookNow(resource)}
                    disabled={resource.status !== 'ACTIVE'}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editingResource}
      />
    </div>
  )
}
