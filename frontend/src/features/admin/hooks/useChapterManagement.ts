import { useState, useCallback } from 'react';
import { ChapterFormData } from '../types/admin.types';

export const useChapterManagement = (onDataRefresh: () => void) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChapterFormData>({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = useCallback((field: keyof ChapterFormData) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingChapterId
        ? `http://localhost:8000/api/chapters/${editingChapterId}/`
        : 'http://localhost:8000/api/chapters/';
      const method = editingChapterId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setEditingChapterId(null);
        setFormData({ name: '', location: '', meeting_day: '', meeting_time: '' });
        alert(`Chapter ${editingChapterId ? 'updated' : 'added'} successfully!`);
        onDataRefresh();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to ${editingChapterId ? 'update' : 'add'} chapter: ${errorData.error || 'Unknown error'}`);
        console.error(`Failed to ${editingChapterId ? 'update' : 'add'} chapter`, errorData);
      }
    } catch (error) {
      console.error(`Failed to ${editingChapterId ? 'update' : 'add'} chapter:`, error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingChapterId, onDataRefresh]);

  const handleDelete = useCallback(async (chapterId: string) => {
    if (!window.confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/chapters/${chapterId}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDataRefresh();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete chapter:', errorData);
        alert(`Failed to delete chapter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete chapter:', error);
      alert('Failed to delete chapter. Please try again.');
    }
  }, [onDataRefresh]);

  const handleAddChapter = useCallback(() => {
    setFormData({
      name: '',
      location: '',
      meeting_day: '',
      meeting_time: '',
    });
    setEditingChapterId(null);
    setShowAddForm(true);
  }, []);

  const handleEditChapter = useCallback((chapter: { chapterId: string; chapterName: string; location?: string; meeting_day?: string; meeting_time?: string }) => {
    setFormData({
      name: chapter.chapterName,
      location: chapter.location || '',
      meeting_day: chapter.meeting_day || '',
      meeting_time: chapter.meeting_time || '',
    });
    setEditingChapterId(chapter.chapterId);
    setShowAddForm(true);
  }, []);

  return {
    showAddForm,
    formData,
    isSubmitting,
    editingChapterId,
    handleFormChange,
    handleSubmit,
    handleDelete,
    handleAddChapter,
    handleEditChapter,
    setShowAddForm,
  };
};
