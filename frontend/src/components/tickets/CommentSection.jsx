import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ticketApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function CommentSection({ ticketId, initialComments = [], onCommentAdded }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const isOwner = (comment) => Number(comment?.author?.id) === Number(user?.id);

  const syncComments = (updater) => {
    setComments((prev) => {
      const nextComments = typeof updater === 'function' ? updater(prev) : updater;
      if (onCommentAdded) {
        onCommentAdded(nextComments);
      }
      return nextComments;
    });
  };

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const res = await ticketApi.addComment(ticketId, { content: newComment });
      syncComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleUpdate = async (commentId) => {
    if (!editingContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setActionLoadingId(commentId);
      const res = await ticketApi.updateComment(ticketId, commentId, { content: editingContent.trim() });

      syncComments((prev) => prev.map((comment) => (comment.id === commentId ? res.data : comment)));

      handleCancelEdit();
      toast.success('Comment updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update comment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) {
      return;
    }

    try {
      setActionLoadingId(commentId);
      await ticketApi.deleteComment(ticketId, commentId);

      syncComments((prev) => prev.filter((comment) => comment.id !== commentId));

      if (editingCommentId === commentId) {
        handleCancelEdit();
      }
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate">{c.author?.name}</span>
                {isOwner(c) && <span className="text-[11px] text-muted-foreground">You</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                {isOwner(c) && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(c)}
                      disabled={loading || actionLoadingId === c.id}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c.id)}
                      disabled={loading || actionLoadingId === c.id}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {editingCommentId === c.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={actionLoadingId === c.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleUpdate(c.id)}
                    disabled={!editingContent.trim() || actionLoadingId === c.id}
                  >
                    {actionLoadingId === c.id ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{c.content}</div>
            )}
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
