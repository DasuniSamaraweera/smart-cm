import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ticketApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import CommentSection from '@/components/tickets/CommentSection';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const res = await ticketApi.getById(id);
      setTicket(res.data);
    } catch (err) {
      console.error("Failed to load ticket", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ticket #{ticket.id}</h1>
          <p className="text-muted-foreground mt-1">Details and communications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{ticket.title}</CardTitle>
                <Badge variant={ticket.status === 'OPEN' ? 'default' : 'secondary'}>{ticket.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span> {ticket.category || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span> {ticket.priority}
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span> {new Date(ticket.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Reporter:</span> {ticket.reporter?.name}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentSection ticketId={ticket.id} initialComments={ticket.comments || []} onCommentAdded={fetchTicket} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assigned To</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
              </div>
              {isAdmin && (
                <div className="mt-4">
                  {/* Admin assignment UI placeholder */}
                  <Button variant="outline" size="sm" className="w-full">Assign Technician</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {ticket.contactEmail || 'N/A'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {ticket.contactPhone || 'N/A'}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
