import { useState, useCallback } from "react";
import { ChapterFormData } from "../types/admin.types";
import { apiClient } from "@/lib/api-client";
import { reportError } from "@/shared/services/error-reporting";

export const useChapterManagement = (onDataRefresh: () => void) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChapterFormData>({
    name: "",
    location: "",
    meeting_day: "",
    meeting_time: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = useCallback((field: keyof ChapterFormData) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        if (editingChapterId) {
          await apiClient.put(`/api/chapters/${editingChapterId}/`, formData);
        } else {
          await apiClient.post("/api/chapters/", formData);
        }

        setShowAddForm(false);
        setEditingChapterId(null);
        setFormData({
          name: "",
          location: "",
          meeting_day: "",
          meeting_time: "",
        });
        alert(
          `Chapter ${editingChapterId ? "updated" : "added"} successfully!`,
        );
        onDataRefresh();
      } catch (error) {
        reportError(error instanceof Error ? error : new Error(`Failed to ${editingChapterId ? "update" : "add"} chapter`), {
          action: editingChapterId ? "updateChapter" : "addChapter",
          additionalData: { chapterName: formData.name },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, editingChapterId, onDataRefresh],
  );

  const handleDelete = useCallback(
    async (chapterId: string) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this chapter? This action cannot be undone.",
        )
      )
        return;

      try {
        await apiClient.delete(`/api/chapters/${chapterId}/`);
        onDataRefresh();
      } catch (error) {
        reportError(error instanceof Error ? error : new Error("Failed to delete chapter"), {
          action: "deleteChapter",
          chapterId,
        });
        alert("Failed to delete chapter. Please try again.");
      }
    },
    [onDataRefresh],
  );

  const handleAddChapter = useCallback(() => {
    setFormData({
      name: "",
      location: "",
      meeting_day: "",
      meeting_time: "",
    });
    setEditingChapterId(null);
    setShowAddForm(true);
  }, []);

  const handleEditChapter = useCallback(
    (chapter: {
      chapterId: string;
      chapterName: string;
      location?: string;
      meeting_day?: string;
      meeting_time?: string;
    }) => {
      setFormData({
        name: chapter.chapterName,
        location: chapter.location || "",
        meeting_day: chapter.meeting_day || "",
        meeting_time: chapter.meeting_time || "",
      });
      setEditingChapterId(chapter.chapterId);
      setShowAddForm(true);
    },
    [],
  );

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
