import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketApi } from '@/api/endpoints';
import { toast } from 'sonner';

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const normalizeFileType = (type) => {
  if (!type) return '';
  const normalized = type.split(';')[0].trim().toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
};

const validateFiles = (files) => {
  if (files.length > MAX_ATTACHMENTS) {
    return `You can upload up to ${MAX_ATTACHMENTS} images per ticket.`;
  }

  for (const file of files) {
    const normalizedType = normalizeFileType(file.type);
    if (!ALLOWED_IMAGE_TYPES.has(normalizedType)) {
      return 'Only JPG, PNG, GIF, and WEBP image files are allowed.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Image '${file.name}' exceeds the 5MB size limit.`;
    }
  }

  return '';
};

export default function CreateTicket() {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    category: '', 
    priority: 'MEDIUM',
    contactEmail: '',
    contactPhone: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAttachmentChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const nextFiles = [...attachments, ...selectedFiles];
    const validationError = validateFiles(nextFiles);

    if (validationError) {
      setAttachmentError(validationError);
      e.target.value = '';
      return;
    }

    setAttachmentError('');
    setAttachments(nextFiles);
    e.target.value = '';
  };

  const removeAttachment = (indexToRemove) => {
    const nextFiles = attachments.filter((_, index) => index !== indexToRemove);
    setAttachments(nextFiles);
    setAttachmentError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateFiles(attachments);
    if (validationError) {
      setAttachmentError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);
    
    try {
      const data = new FormData();
      data.append('ticket', new Blob([JSON.stringify(formData)], { type: 'application/json' }));
      attachments.forEach((file) => data.append('files', file));
      
      await ticketApi.create(data);
      toast.success('Ticket submitted successfully');
      navigate('/tickets/my');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create ticket';
      toast.error(message);
      console.error('Failed to create ticket', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Maintenance Ticket</h1>
        <p className="text-muted-foreground mt-1">Submit a new issue or request for maintenance.</p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title</Label>
              <Input 
                id="title"
                required 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Brief summary of the issue"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLUMBING">Plumbing</SelectItem>
                  <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="CLEANING">Cleaning</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                required 
                className="min-h-[100px]"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Provide detailed information about the issue"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
                <Input 
                  id="contactPhone"
                  value={formData.contactPhone} 
                  onChange={e => setFormData({...formData, contactPhone: e.target.value})} 
                  placeholder="e.g. +1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
                <Input 
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail} 
                  onChange={e => setFormData({...formData, contactEmail: e.target.value})} 
                  placeholder="e.g. name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Image Attachments (Optional, up to 3)</Label>
              <Input
                id="attachments"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleAttachmentChange}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPG, PNG, GIF, WEBP. Max 5MB per image.
              </p>
              {attachmentError && (
                <p className="text-sm text-red-600">{attachmentError}</p>
              )}
              {attachments.length > 0 && (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">Selected Images ({attachments.length}/3)</p>
                  {attachments.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
