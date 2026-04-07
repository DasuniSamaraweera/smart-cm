import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authApi, ticketApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CommentSection from '@/components/tickets/CommentSection';

const statusVariant = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
  REJECTED: 'destructive',
};

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (isAdmin) {
      fetchAssignees();
    }
  }, [isAdmin]);

  const fetchTicket = async () => {
    try {
      const res = await ticketApi.getById(id);
      setTicket(res.data);
      setSelectedAssignee(res.data.assignedTo?.id ? String(res.data.assignedTo.id) : '');
    } catch (err) {
      console.error("Failed to load ticket", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignees = async () => {
    try {
      const res = await authApi.getUsers();
      setAssignees(res.data.filter((u) => u.role === 'TECHNICIAN' || u.role === 'ADMIN'));
    } catch (err) {
      console.error('Failed to load assignees', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }

    try {
      setAssigning(true);
      await ticketApi.assign(ticket.id, { assigneeId: Number(selectedAssignee) });
      toast.success('Ticket assignment updated');
      await fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setAssigning(false);
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
                <Badge variant={statusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
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
                <div className="mt-4 space-y-2">
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician or admin" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={String(assignee.id)}>
                          {assignee.name} ({assignee.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAssign}
                    disabled={assigning || !selectedAssignee}
                  >
                    {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Assignment
                  </Button>
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
