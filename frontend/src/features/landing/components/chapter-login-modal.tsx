import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';

interface Chapter {
  id: number;
  name: string;
  location: string;
}

interface ChapterLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  onSuccess: (chapterId: string) => void;
}

export const ChapterLoginModal: React.FC<ChapterLoginModalProps> = ({
  isOpen,
  onClose,
  chapter,
  onSuccess,
}) => {
  const { authenticateChapter } = useAuth();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [retryAfterMinutes, setRetryAfterMinutes] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setAttemptsRemaining(5);
      setLockedOut(false);
      setRetryAfterMinutes(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await authenticateChapter(chapter.id.toString(), password);

      if (result.success) {
        onSuccess(chapter.id.toString());
      } else {
        if (result.lockedOut) {
          setLockedOut(true);
          setRetryAfterMinutes(result.retryAfterMinutes || null);
          setError(result.error || 'Too many failed attempts');
        } else {
          setError(result.error || 'Invalid password');
          setAttemptsRemaining(result.attemptsRemaining ?? null);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Chapter Login
          </DialogTitle>
          <DialogDescription>
            Enter the password for <strong>{chapter.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter chapter password"
              disabled={isLoading || lockedOut}
              autoFocus
            />
          </div>

          {/* Attempts Remaining Counter */}
          {attemptsRemaining !== null && !lockedOut && (
            <div className="text-sm">
              <p className={`font-medium ${attemptsRemaining <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {lockedOut && retryAfterMinutes && (
                  <span className="block mt-1">
                    Please try again in {retryAfterMinutes} {retryAfterMinutes === 1 ? 'minute' : 'minutes'}.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !password || lockedOut}
            >
              {isLoading ? 'Authenticating...' : 'Login'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
