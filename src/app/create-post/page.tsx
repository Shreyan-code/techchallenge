'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import React from 'react';

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function CreatePostClient() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const repostContent = searchParams.get('repostContent');
    const repostAuthor = searchParams.get('repostAuthor');
    const repostImageUrl = searchParams.get('repostImageUrl');
    
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (repostContent && repostAuthor) {
            setContent(`Reposting from @${repostAuthor}:\n\n"${repostContent}"`);
        }
        if (repostImageUrl) {
            setImagePreview(repostImageUrl);
        }
    }, [repostContent, repostAuthor, repostImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const dataUri = await fileToDataUri(file);
      setImagePreview(dataUri);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!content.trim() && !imageFile && !imagePreview)) {
      toast({
        variant: 'destructive',
        title: 'Empty Post',
        description: 'Please add some content or an image to your post.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined = imagePreview || undefined;
      if (imageFile) {
        imageUrl = await fileToDataUri(imageFile);
      }
      
      const postsCol = collection(firestore, 'posts');
      addDocumentNonBlocking(postsCol, {
        authorId: user.uid,
        content: content,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likes: [],
        commentCount: 0,
      });

      toast({
        title: 'Post Created!',
        description: 'Your post is now live on the feed.',
      });

      router.push('/');
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not create your post. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold font-headline mb-2">Create a New Post</h1>
      <p className="text-muted-foreground mb-6">
        Share what’s on your mind with the community.
      </p>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] text-base"
              disabled={isSubmitting}
            />

            {imagePreview ? (
              <div className="relative group w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center">
                <Image
                  src={imagePreview}
                  alt="Post preview"
                  fill
                  className="object-contain rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="post-image"
                className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Upload an image</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or WEBP (Optional)
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  id="post-image"
                  name="image"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
              </label>
            )}

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function CreatePostPage() {
    return (
        <React.Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
            <CreatePostClient />
        </React.Suspense>
    )
}
