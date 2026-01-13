'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  useCollection,
  useDoc,
  useFirestore,
  useUser,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  serverTimestamp,
  doc,
  increment,
} from 'firebase/firestore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';

function Comment({ comment }: { comment: any }) {
  const firestore = useFirestore();
  const authorRef = useMemoFirebase(
    () => (comment.authorId ? doc(firestore, 'users', comment.authorId) : null),
    [comment.authorId, firestore]
  );
  const { data: author, isLoading } = useDoc(authorRef);
  const timeAgo = comment.createdAt?.toDate
    ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })
    : 'just now';

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="space-y-2">
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <Link href={`/profile/${comment.authorId}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={author?.profilePicture} alt={author?.userName} />
          <AvatarFallback>{author?.userName?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
            <Link href={`/profile/${comment.authorId}`} className="hover:underline">
              <p className="font-semibold text-sm">{author?.userName}</p>
            </Link>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        <p className="text-sm">{comment.content}</p>
      </div>
    </div>
  );
}

export function AdviceComments({
  postId,
  isOpen,
  onOpenChange,
  postAuthorName,
}: {
  postId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  postAuthorName: string | undefined;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'advicePosts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      ),
    [firestore, postId]
  );
  const { data: comments, isLoading } = useCollection(commentsQuery);

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    
    const commentsCol = collection(firestore, 'advicePosts', postId, 'comments');
    addDocumentNonBlocking(commentsCol, {
      authorId: user.uid,
      content: newComment,
      createdAt: serverTimestamp(),
      advicePostId: postId,
    });

    const postRef = doc(firestore, 'advicePosts', postId);
    updateDocumentNonBlocking(postRef, {
        commentCount: increment(1)
    });

    setNewComment('');
    setIsSubmitting(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>
            Viewing comments on a tip from {postAuthorName || 'a user'}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6 py-4">
              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {comments && comments.length > 0 ? (
                comments.map((comment) => (
                  <Comment key={comment.id} comment={comment} />
                ))
              ) : (
                !isLoading && <p className="text-center text-muted-foreground">No comments yet.</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <SheetFooter className="mt-auto">
          {user && !isUserLoading && (
            <div className="flex items-start gap-4 pt-4 border-t">
              <Avatar className="h-9 w-9">
                <AvatarImage src={userProfile?.profilePicture || user.photoURL || undefined} />
                <AvatarFallback>
                  {userProfile?.userName?.charAt(0)?.toUpperCase() || user.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="pr-12"
                  disabled={isSubmitting}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={handleAddComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin"/>
                  ): (
                      <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
