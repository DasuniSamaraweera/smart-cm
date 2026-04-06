import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ticketApi } from '@/api/endpoints';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    ticketApi.getAll({ my: true }).then((res) => {
      setTickets(res.data);
    }).catch(err => {
      console.error("Failed to fetch tickets", err);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-muted-foreground mt-1">Track issues you have reported.</p>
        </div>
        <Button onClick={() => navigate('/tickets/create')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Ticket
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map(ticket => (
          <Card key={ticket.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/tickets/${ticket.id}`)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{ticket.title}</CardTitle>
                <Badge variant={ticket.status === 'OPEN' ? 'default' : ticket.status === 'CLOSED' ? 'outline' : 'secondary'}>
                  {ticket.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
              <div className="text-xs text-muted-foreground mt-2">
                Priority: {ticket.priority} | Category: {ticket.category}
              </div>
            </CardContent>
          </Card>
        ))}
        {tickets.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            You haven't submitted any tickets yet.
          </div>
        )}
      </div>
    </div>
  );
}
