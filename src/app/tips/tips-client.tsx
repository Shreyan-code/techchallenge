'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Loader2,
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  TrendingUp,
  Clock,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdviceComments } from '@/components/AdviceComments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function AdvicePostCard({ post }: { post: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const authorRef = useMemoFirebase(
    () => (post.authorId ? doc(firestore, 'users', post.authorId) : null),
    [post.authorId, firestore]
  );
  const { data: author } = useDoc(authorRef);

  const handleVote = (voteType: 'up' | 'down') => {
    if (!user) return;
    const postRef = doc(firestore, 'advicePosts', post.id);

    const upvotes = post.upvotes || [];
    const downvotes = post.downvotes || [];
    const isUpvoted = upvotes.includes(user.uid);
    const isDownvoted = downvotes.includes(user.uid);

    let newUpvotes = [...upvotes];
    let newDownvotes = [...downvotes];

    if (voteType === 'up') {
      if (isUpvoted) {
        newUpvotes = newUpvotes.filter((uid) => uid !== user.uid); // Un-upvote
      } else {
        newUpvotes.push(user.uid);
        if (isDownvoted) {
          newDownvotes = newDownvotes.filter((uid) => uid !== user.uid); // Remove downvote if upvoting
        }
      }
    } else if (voteType === 'down') {
      if (isDownvoted) {
        newDownvotes = newDownvotes.filter((uid) => uid !== user.uid); // Un-downvote
      } else {
        newDownvotes.push(user.uid);
        if (isUpvoted) {
          newUpvotes = newUpvotes.filter((uid) => uid !== user.uid); // Remove upvote if downvoting
        }
      }
    }

    updateDocumentNonBlocking(postRef, {
      upvotes: newUpvotes,
      downvotes: newDownvotes,
    });
  };

  const voteCount = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
  const isUpvoted = user && post.upvotes?.includes(user.uid);
  const isDownvoted = user && post.downvotes?.includes(user.uid);
  const timeAgo = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleVote('up')}>
            <ArrowBigUp className={cn(isUpvoted && 'fill-primary text-primary')} />
          </Button>
          <span className="font-bold text-lg">{voteCount}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleVote('down')}>
            <ArrowBigDown className={cn(isDownvoted && 'fill-destructive text-destructive')} />
          </Button>
        </div>
        <div className="flex-1">
            <CardTitle className="font-headline text-xl">{post.title}</CardTitle>
             <CardDescription className="flex items-center gap-2 text-xs">
                <Link href={`/profile/${author?.id}`} className="flex items-center gap-1 hover:underline">
                    <Avatar className="h-4 w-4">
                        <AvatarImage src={author?.profilePicture} />
                        <AvatarFallback>{author?.userName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{author?.userName || 'a user'}</span>
                </Link>
                <span>&bull;</span>
                <span>{timeAgo}</span>
            </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm line-clamp-4">{post.content}</p>
      </CardContent>
      <CardFooter>
         <Button variant="ghost" size="sm" onClick={() => setIsCommentsOpen(true)}>
          <MessageCircle className="mr-2" />
          <span>{post.commentCount || 0} Comments</span>
        </Button>
      </CardFooter>
      <AdviceComments
        postId={post.id}
        isOpen={isCommentsOpen}
        onOpenChange={setIsCommentsOpen}
        postAuthorName={author?.userName}
       />
    </Card>
  );
}

export function TipsClient() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('trending');

  const adviceQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'advicePosts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection(adviceQuery);

  const filteredAndSortedPosts = useMemo(() => {
    if (!posts) return [];
    
    // Filter
    const filtered = posts.filter(post => 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    if (sortBy === 'trending') {
      return filtered.sort((a, b) => {
        const scoreA = (a.upvotes?.length || 0) - (a.downvotes?.length || 0);
        const scoreB = (b.upvotes?.length || 0) - (b.downvotes?.length || 0);
        return scoreB - scoreA;
      });
    }
    
    // Default to 'newest' (already sorted by createdAt desc)
    return filtered;

  }, [posts, searchTerm, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2">Tips & Advice</h1>
          <p className="text-muted-foreground">Share and discover community wisdom.</p>
        </div>
        <Button asChild>
          <Link href="/create-advice">Share a Tip</Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Search tips..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
         <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="trending"><TrendingUp className="mr-2"/>Trending</SelectItem>
                <SelectItem value="newest"><Clock className="mr-2"/>Newest</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filteredAndSortedPosts.length === 0 && (
        <div className="text-center p-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {searchTerm ? 'No tips found matching your search.' : 'No tips yet. Why not share one?'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filteredAndSortedPosts.map((post) => (
          <AdvicePostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
