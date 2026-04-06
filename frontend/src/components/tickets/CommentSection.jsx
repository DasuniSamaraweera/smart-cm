import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ticketApi } from '@/api/endpoints';

export default function CommentSection({ ticketId, initialComments = [], onCommentAdded }) {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const res = await ticketApi.addComment(ticketId, { content: newComment });
      if (onCommentAdded) {
        onCommentAdded();
      } else {
        setComments([...comments, res.data]);
      }
      setNewComment('');
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments.map(c => (
          <div key={c.id} className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{c.author?.name}</span>
              <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap">{c.content}</div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center">No comments yet.</div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 pt-4 border-t">
        <Textarea 
          value={newComment} 
          onChange={e => setNewComment(e.target.value)} 
          placeholder="Add a comment..." 
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button onClick={handleAdd} disabled={!newComment.trim() || loading} size="sm">
            {loading ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
