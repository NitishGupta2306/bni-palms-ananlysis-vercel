import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Building2,
  Mail,
  Phone,
  UserPlus,
  Loader2,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";
import { API_BASE_URL } from "@/config/api";
import { apiClient } from "@/lib/apiClient";

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  business_name: string;
  classification: string;
  email: string;
  phone: string;
  joined_date?: string;
  is_active: boolean;
}

interface MembersTabProps {
  chapterData: ChapterMemberData;
  onMemberSelect: (memberName: string) => void;
  onMemberAdded?: () => void;
}

const MembersTab: React.FC<MembersTabProps> = ({
  chapterData,
  onMemberSelect,
  onMemberAdded,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    business_name: "",
    classification: "",
    email: "",
    phone: "",
    joined_date: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    if (!chapterData.chapterId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<any>(
        `/api/chapters/${chapterData.chapterId}/`,
      );
      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to load members:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [chapterData.chapterId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = () => {
    // Set default joined_date to today
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      first_name: "",
      last_name: "",
      business_name: "",
      classification: "",
      email: "",
      phone: "",
      joined_date: today,
      is_active: true,
    });
    setOpenAddDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenAddDialog(false);
  };

  const handleFormChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "is_active" ? event.target.checked : event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/api/chapters/${chapterData.chapterId}/members/`,
        formData,
      );

      toast({
        title: "Success!",
        description: "Member added successfully!",
        variant: "success",
      });
      handleCloseDialog();
      fetchMembers();
      // Trigger parent data refresh to update member counts
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (member: Member) => {
    setUpdatingStatus(member.id);
    try {
      await apiClient.patch(
        `/api/chapters/${chapterData.chapterId}/members/${member.id}/`,
        { is_active: !member.is_active },
      );

      toast({
        title: "Status Updated",
        description: `${member.full_name} marked as ${!member.is_active ? "active" : "inactive"}`,
        variant: "success",
      });
      fetchMembers();
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredMembers = members.filter((member) => {
    if (statusFilter === "active") return member.is_active;
    if (statusFilter === "inactive") return !member.is_active;
    return true; // 'all'
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>Failed to load members: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Chapter Members
        </h2>
        <Button
          onClick={handleAddMember}
          className="flex items-center gap-2"
          size="sm"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} members in{" "}
          {chapterData.chapterName}
        </p>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value: any) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <Card
            key={member.id}
            className={`transition-all duration-200 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-gray-800/20 ${
              !member.is_active ? "opacity-60" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onMemberSelect(member.full_name)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-base">
                      {member.full_name}
                    </h3>
                    <Badge
                      variant={member.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {member.business_name && (
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {member.business_name}
                      </span>
                    </div>
                  )}
                  {member.classification && (
                    <Badge variant="outline" className="mb-2">
                      {member.classification}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {member.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {member.phone}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {member.is_active ? "Mark as Inactive" : "Mark as Active"}
                </span>
                <Switch
                  checked={member.is_active}
                  onCheckedChange={() => handleToggleStatus(member)}
                  disabled={updatingStatus === member.id}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && members.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No members found with the selected filter.
          </p>
        </div>
      )}

      {members.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No members found for this chapter.
          </p>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium">
                First Name *
              </label>
              <Input
                id="first_name"
                autoFocus
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={handleFormChange("first_name")}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium">
                Last Name *
              </label>
              <Input
                id="last_name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={handleFormChange("last_name")}
                required
              />
            </div>
            <div className="space-y-2 col-span-full">
              <label htmlFor="business_name" className="text-sm font-medium">
                Business Name
              </label>
              <Input
                id="business_name"
                placeholder="Enter business name"
                value={formData.business_name}
                onChange={handleFormChange("business_name")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="classification" className="text-sm font-medium">
                Classification
              </label>
              <Input
                id="classification"
                placeholder="e.g., Accountant, Lawyer, Real Estate"
                value={formData.classification}
                onChange={handleFormChange("classification")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleFormChange("email")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone
              </label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleFormChange("phone")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="joined_date" className="text-sm font-medium">
                Joined Date
              </label>
              <Input
                id="joined_date"
                type="date"
                value={formData.joined_date}
                onChange={handleFormChange("joined_date")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || !formData.first_name || !formData.last_name
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersTab;
