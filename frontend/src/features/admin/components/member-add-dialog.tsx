import React, { useState, useEffect } from 'react';
import { ChapterMemberData } from '../../../shared/services/ChapterDataLoader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { apiClient } from '@/lib/apiClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MemberAddDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chapters: ChapterMemberData[];
}

interface MemberFormData {
  chapter_id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  classification: string;
  email: string;
  phone: string;
  is_active: boolean;
}

export const MemberAddDialog: React.FC<MemberAddDialogProps> = ({
  open,
  onClose,
  onSuccess,
  chapters,
}) => {
  const { success, error } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MemberFormData>({
    chapter_id: '',
    first_name: '',
    last_name: '',
    business_name: '',
    classification: '',
    email: '',
    phone: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormData, string>>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        chapter_id: chapters.length > 0 ? chapters[0].chapterId : '',
        first_name: '',
        last_name: '',
        business_name: '',
        classification: '',
        email: '',
        phone: '',
        is_active: true,
      });
      setErrors({});
    }
  }, [open, chapters]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MemberFormData, string>> = {};

    // Chapter validation
    if (!formData.chapter_id) {
      newErrors.chapter_id = 'Please select a chapter';
    }

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.length > 100) {
      newErrors.first_name = 'First name must be less than 100 characters';
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.length > 100) {
      newErrors.last_name = 'Last name must be less than 100 characters';
    }

    // Email validation (optional, but if provided must be valid)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      } else if (formData.email.length > 254) {
        newErrors.email = 'Email must be less than 254 characters';
      }
    }

    // Phone validation (optional, but if provided should be reasonable format)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      } else if (formData.phone.length > 20) {
        newErrors.phone = 'Phone number must be less than 20 characters';
      }
    }

    // Business name validation (optional)
    if (formData.business_name && formData.business_name.length > 200) {
      newErrors.business_name = 'Business name must be less than 200 characters';
    }

    // Classification validation (optional)
    if (formData.classification && formData.classification.length > 100) {
      newErrors.classification = 'Classification must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for API (exclude chapter_id from the payload)
      const { chapter_id, ...memberData } = formData;

      await apiClient.post(
        `/api/chapters/${chapter_id}/members/`,
        memberData
      );

      success('Success', `${formData.first_name} ${formData.last_name} has been added`);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add member:', err);

      const errorMessage = err.response?.data?.error
        || err.response?.data?.message
        || 'Failed to add member. Please try again.';

      error('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof MemberFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  };

  const handleChapterChange = (value: string) => {
    setFormData((prev) => ({ ...prev, chapter_id: value }));
    if (errors.chapter_id) {
      setErrors((prev) => ({ ...prev, chapter_id: undefined }));
    }
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, is_active: value === 'active' }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Add a new member to a chapter
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Chapter Selection */}
            <div className="grid gap-2">
              <Label htmlFor="chapter">
                Chapter <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.chapter_id}
                onValueChange={handleChapterChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="chapter" className={errors.chapter_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.chapterId} value={chapter.chapterId}>
                      {chapter.chapterName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chapter_id && (
                <p className="text-sm text-destructive">{errors.chapter_id}</p>
              )}
            </div>

            {/* First Name */}
            <div className="grid gap-2">
              <Label htmlFor="first_name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                placeholder="John"
                disabled={isSubmitting}
                className={errors.first_name ? 'border-destructive' : ''}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="grid gap-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                placeholder="Doe"
                disabled={isSubmitting}
                className={errors.last_name ? 'border-destructive' : ''}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name}</p>
              )}
            </div>

            {/* Business Name */}
            <div className="grid gap-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={handleInputChange('business_name')}
                placeholder="Acme Corp"
                disabled={isSubmitting}
                className={errors.business_name ? 'border-destructive' : ''}
              />
              {errors.business_name && (
                <p className="text-sm text-destructive">{errors.business_name}</p>
              )}
            </div>

            {/* Classification */}
            <div className="grid gap-2">
              <Label htmlFor="classification">Classification</Label>
              <Input
                id="classification"
                value={formData.classification}
                onChange={handleInputChange('classification')}
                placeholder="e.g., Technology, Finance"
                disabled={isSubmitting}
                className={errors.classification ? 'border-destructive' : ''}
              />
              {errors.classification && (
                <p className="text-sm text-destructive">{errors.classification}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="john@example.com"
                disabled={isSubmitting}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onValueChange={handleStatusChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
