import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { ArrowLeft, Loader2, Mail, Phone } from 'lucide-react';
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
  const { user, isAdmin } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [assigneeLoadError, setAssigneeLoadError] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [resolutionNotesInput, setResolutionNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (isAdmin) {
      fetchAssignees();
    }
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;
    const objectUrls = [];

    const loadAttachments = async () => {
      if (!ticket?.id || !Array.isArray(ticket.attachments) || ticket.attachments.length === 0) {
        setAttachmentUrls({});
        setAttachmentsLoading(false);
        return;
      }

      try {
        setAttachmentsLoading(true);
        const entries = await Promise.all(
          ticket.attachments.map(async (attachment) => {
            const res = await ticketApi.getAttachment(ticket.id, attachment.id);
            const blob =
              res.data instanceof Blob
                ? res.data
                : new Blob([res.data], {
                    type: attachment.fileType || 'application/octet-stream',
                  });
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            return [attachment.id, url];
          })
        );

        if (isMounted) {
          setAttachmentUrls(Object.fromEntries(entries));
        }
      } catch (err) {
        console.error('Failed to load attachments', err);
        if (isMounted) {
          setAttachmentUrls({});
          toast.error(err.response?.data?.message || 'Unable to load ticket attachments');
        }
      } finally {
        if (isMounted) {
          setAttachmentsLoading(false);
        }
      }
    };

    loadAttachments();

    return () => {
      isMounted = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [ticket?.id, ticket?.updatedAt, ticket?.attachments]);

  const fetchTicket = async () => {
    try {
      const res = await ticketApi.getById(id);
      setTicket(res.data);
      setSelectedAssignee(res.data.assignedTo?.id ? String(res.data.assignedTo.id) : '');
      setResolutionNotesInput(res.data.resolutionNotes || '');
      setRejectionReasonInput(res.data.rejectionReason || '');
    } catch (err) {
      console.error("Failed to load ticket", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignees = async () => {
    try {
      setAssigneeLoadError('');
      const res = await authApi.getTechnicians();
      setAssignees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load assignees', err);
      setAssignees([]);
      setAssigneeLoadError(err.response?.data?.message || 'Unable to load technicians for assignment');
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
      toast.success('Ticket assigned successfully');
      await fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (nextStatus) => {
    const payload = { status: nextStatus };

    if (nextStatus === 'RESOLVED') {
      payload.resolutionNotes = resolutionNotesInput || null;
    }

    if (nextStatus === 'REJECTED') {
      const reason = rejectionReasonInput.trim();
      if (!reason) {
        toast.error('Rejection reason is required');
        return;
      }
      payload.rejectionReason = reason;
    }

    try {
      setStatusUpdating(true);
      await ticketApi.updateStatus(ticket.id, payload);
      toast.success(`Ticket marked as ${nextStatus.replace('_', ' ')}`);
      await fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!ticket) return <div>Ticket not found</div>;

  const isAssignedTechnician =
    user?.role === 'TECHNICIAN' && Number(ticket.assignedTo?.id) === Number(user?.id);
  const canReject = isAdmin && ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED';
  const canClose = isAdmin && ticket.status === 'RESOLVED';
  const canResolve = isAssignedTechnician && ticket.status === 'IN_PROGRESS';
  const canAssign = isAdmin && ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED';

  const formatActivityTimestamp = (timestamp) => {
    if (!timestamp) {
      return 'Time unavailable';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Time unavailable';
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));
    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (dayDiff === 0) {
      return `Today, ${timePart}`;
    }

    if (dayDiff === 1) {
      return `Yesterday, ${timePart}`;
    }

    const datePart = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${datePart}, ${timePart}`;
  };

  const currentStatusLabel = ticket.status ? ticket.status.replace(/_/g, ' ') : '';
  const statusEventText = {
    RESOLVED: 'Ticket resolved',
    CLOSED: 'Ticket closed',
    REJECTED: 'Ticket rejected',
  }[ticket.status] || `Status updated to ${currentStatusLabel}`;

  const activityEvents = [
    {
      key: `status-${ticket.status}-${ticket.updatedAt || ''}`,
      text: statusEventText,
      timestamp: ticket.updatedAt || ticket.createdAt,
    },
    ticket.assignedTo
      ? {
          key: `assigned-${ticket.assignedTo.id}-${ticket.updatedAt || ''}`,
          text: `Ticket assigned to ${ticket.assignedTo.name}`,
          timestamp: ticket.updatedAt || ticket.createdAt,
        }
      : null,
    {
      key: `created-${ticket.id}-${ticket.createdAt || ''}`,
      text: `Ticket created by ${ticket.reporter?.name || 'Reporter'}`,
      timestamp: ticket.createdAt,
    },
  ]
    .filter(Boolean)
    .map((event) => {
      const eventDate = new Date(event.timestamp);
      return {
        ...event,
        eventDate,
      };
    })
    .filter((event) => !Number.isNaN(event.eventDate.getTime()))
    .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

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

              {ticket.attachments?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Attachments</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ticket.attachments.map((attachment) => {
                      const imageUrl = attachmentUrls[attachment.id];
                      return (
                        <div key={attachment.id} className="rounded-md border bg-background p-2 space-y-2">
                          {imageUrl ? (
                            <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={imageUrl}
                                alt={attachment.fileName}
                                className="h-36 w-full rounded-md border object-cover"
                              />
                            </a>
                          ) : (
                            <div className="flex h-36 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                              {attachmentsLoading ? 'Loading attachment...' : 'Preview unavailable'}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground break-all">{attachment.fileName}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ticket.resolutionNotes && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Resolution Notes</h4>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 whitespace-pre-wrap">
                    {ticket.resolutionNotes}
                  </div>
                </div>
              )}

              {ticket.rejectionReason && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Rejection Reason</h4>
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 whitespace-pre-wrap">
                    {ticket.rejectionReason}
                  </div>
                </div>
              )}
              
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
                  {assigneeLoadError && (
                    <p className="text-xs text-destructive">{assigneeLoadError}. Please re-login and try again.</p>
                  )}
                  {!assigneeLoadError && assignees.length === 0 && (
                    <p className="text-xs text-muted-foreground">No technician users found. Create one from User Management.</p>
                  )}
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
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
                    variant="default"
                    size="sm"
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={handleAssign}
                    disabled={assigning || !selectedAssignee || !canAssign || !!assigneeLoadError || assignees.length === 0}
                  >
                    {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Assignment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityEvents.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 pl-4">
                  {activityEvents.map((event, index) => (
                    <div
                      key={event.key}
                      className={`relative ${index === activityEvents.length - 1 ? 'pb-0' : 'pb-5'}`}
                    >
                      <span
                        className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                          index === 0 ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <p className="text-sm font-medium text-slate-700">{event.text}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatActivityTimestamp(event.timestamp)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No activity available</p>
              )}

              <div className="space-y-3 border-t border-slate-200 pt-3">
                {canResolve && (
                  <>
                    <Textarea
                      placeholder="Add optional resolution notes"
                      value={resolutionNotesInput}
                      onChange={(e) => setResolutionNotesInput(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleStatusUpdate('RESOLVED')}
                      disabled={statusUpdating}
                    >
                      {statusUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Mark as Resolved
                    </Button>
                  </>
                )}

                {canClose && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleStatusUpdate('CLOSED')}
                    disabled={statusUpdating}
                  >
                    {statusUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Close Ticket
                  </Button>
                )}

                {canReject && (
                  <>
                    <Textarea
                      placeholder="Rejection reason (required)"
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleStatusUpdate('REJECTED')}
                      disabled={statusUpdating}
                    >
                      {statusUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reject Ticket
                    </Button>
                  </>
                )}

                {!canResolve && !canClose && !canReject && (
                  <p className="text-xs text-muted-foreground">
                    No status actions are available for your role on this ticket.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-blue-200 bg-blue-50/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-blue-700">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Email Address</p>
                  <p className="break-all text-sm font-bold text-blue-900">{ticket.contactEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Phone Number</p>
                  <p className="text-sm font-bold text-blue-900">{ticket.contactPhone || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
