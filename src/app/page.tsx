'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat, Loader2 } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { PostComments } from '@/components/PostComments';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// A component to render a single post, fetching author details separately
function PostCard({ post }: { post: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Memoize the document reference for the post's author
  const authorRef = useMemoFirebase(
    () => (post.authorId ? doc(firestore, 'users', post.authorId) : null),
    [post.authorId, firestore]
  );
  
  // Fetch the author's profile
  const { data: author, isLoading: isAuthorLoading } = useDoc(authorRef);

  const handleLike = () => {
    if (!user || !post.id) return;
    const postRef = doc(firestore, 'posts', post.id);
    // Ensure likes is an array before checking
    const currentLikes = Array.isArray(post.likes) ? post.likes : [];
    const isLiked = currentLikes.includes(user.uid);
    
    updateDocumentNonBlocking(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleRepost = () => {
    if (!author) return;
    let url = `/create-post?repostContent=${encodeURIComponent(post.content)}&repostAuthor=${encodeURIComponent(author.userName)}`;
    if (post.imageUrl) {
      url += `&repostImageUrl=${encodeURIComponent(post.imageUrl)}`;
    }
    router.push(url);
  };


  if (isAuthorLoading) {
    return (
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <Avatar>
            <AvatarFallback><Loader2 className="animate-spin" /></AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
           <div className="h-4 bg-muted rounded w-full" />
           <div className="h-4 bg-muted rounded w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Format the timestamp
  const timeAgo = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now';
  // Ensure likes is an array before checking its length or contents
  const currentLikes = Array.isArray(post.likes) ? post.likes : [];
  const likeCount = currentLikes.length;
  const isLikedByUser = user && currentLikes.includes(user.uid);

  return (
    <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Link href={`/profile/${post.authorId}`} className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={author?.profilePicture} alt={author?.userName} />
            <AvatarFallback>{author?.userName?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${post.authorId}`} className="hover:underline">
            <p className="font-semibold">{author?.userName}</p>
          </Link>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {post.imageUrl && (
          <div className="aspect-square relative w-full">
            <Image
              src={post.imageUrl}
              alt="Pet post"
              fill
              className="object-cover"
            />
          </div>
        )}
        <p className="p-4 text-sm">{post.content}</p>
      </CardContent>
      <CardFooter className="p-2 border-t flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleLike}>
          <Heart className={cn("mr-2", isLikedByUser && "fill-red-500 text-red-500")} />
          <span>{likeCount}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsCommentsOpen(true)}>
          <MessageCircle className="mr-2" />
          <span>{post.commentCount || 0}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRepost}>
          <Repeat className="mr-2" />
          <span>Repost</span>
        </Button>
      </CardFooter>
       <PostComments 
        postId={post.id} 
        isOpen={isCommentsOpen} 
        onOpenChange={setIsCommentsOpen} 
        postAuthorName={author?.userName}
      />
    </Card>
  );
}


export default function SocialFeedPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Memoize the query to fetch posts, ordered by creation date
  const postsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null),
    [firestore, user]
  );
  
  // Fetch the posts collection
  const { data: posts, isLoading } = useCollection(postsQuery);

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold font-headline mb-6">Feed</h1>
      {isLoading && posts === null && (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="space-y-6">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
