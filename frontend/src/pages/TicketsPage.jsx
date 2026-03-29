import { TicketCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Tickets</h1>
        <p className="text-muted-foreground mt-1">Report and track maintenance issues.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <TicketCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-1">
            The ticketing system is under development.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
