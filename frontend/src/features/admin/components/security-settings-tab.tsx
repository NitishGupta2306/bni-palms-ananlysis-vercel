import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Key,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/auth-context";

interface Chapter {
  id: number;
  name: string;
  location: string;
  password?: string;
}

export const SecuritySettingsTab: React.FC = () => {
  const { adminAuth } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | "admin" | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPasswords, setShowPasswords] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      setIsLoading(true);

      // Fetch all chapters
      const chaptersResponse = await fetch(`${API_BASE_URL}/api/chapters/`);
      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json();
        setChapters(
          chaptersData.map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            location: ch.location,
            password: "", // Will be set individually
          })),
        );
      }

      // Fetch admin settings to get current passwords
      const adminResponse = await fetch(
        `${API_BASE_URL}/api/admin/get-settings/`,
        {
          headers: {
            Authorization: `Bearer ${adminAuth?.token}`,
          },
        },
      );

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        setAdminPassword(adminData.admin_password || "");

        // Set chapter passwords if available
        if (adminData.chapters) {
          setChapters((prev) =>
            prev.map((ch) => {
              const chapterData = adminData.chapters.find(
                (c: any) => c.id === ch.id,
              );
              return chapterData
                ? { ...ch, password: chapterData.password }
                : ch;
            }),
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch passwords:", error);
      showMessage("error", "Failed to load password data");
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdateChapterPassword = async (
    chapterId: number,
    newPassword: string,
  ) => {
    if (!newPassword || newPassword.trim().length === 0) {
      showMessage("error", "Password cannot be empty");
      return;
    }

    setUpdatingId(chapterId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chapters/${chapterId}/update_password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminAuth?.token}`,
          },
          body: JSON.stringify({ new_password: newPassword }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        showMessage(
          "success",
          data.message || "Chapter password updated successfully",
        );

        // Update local state
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === chapterId ? { ...ch, password: newPassword } : ch,
          ),
        );
      } else {
        const error = await response.json();
        showMessage(
          "error",
          error.error || "Failed to update chapter password",
        );
      }
    } catch (error) {
      console.error("Failed to update chapter password:", error);
      showMessage("error", "Failed to update chapter password");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateAdminPassword = async (newPassword: string) => {
    if (!newPassword || newPassword.trim().length === 0) {
      showMessage("error", "Password cannot be empty");
      return;
    }

    setUpdatingId("admin");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/update_password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminAuth?.token}`,
          },
          body: JSON.stringify({ new_password: newPassword }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        showMessage(
          "success",
          data.message || "Admin password updated successfully",
        );
        setAdminPassword(newPassword);
      } else {
        const error = await response.json();
        showMessage("error", error.error || "Failed to update admin password");
      }
    } catch (error) {
      console.error("Failed to update admin password:", error);
      showMessage("error", "Failed to update admin password");
    } finally {
      setUpdatingId(null);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Security Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage passwords for admin dashboard and chapter access
          </p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <Card
          className={
            message.type === "success"
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }
        >
          <CardContent className="flex items-center gap-2 pt-6">
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p
              className={
                message.type === "success" ? "text-green-800" : "text-red-800"
              }
            >
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Admin Dashboard Password
          </CardTitle>
          <CardDescription>
            Password required to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="admin-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPasswords["admin"] ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter new admin password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("admin")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-50/50 rounded"
                  >
                    {showPasswords["admin"] ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => handleUpdateAdminPassword(adminPassword)}
                  disabled={updatingId === "admin"}
                >
                  {updatingId === "admin" ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chapter Passwords Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Chapter Passwords
          </CardTitle>
          <CardDescription>
            Passwords required to access individual chapter dashboards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters.map((chapter) => (
              <ChapterPasswordRow
                key={chapter.id}
                chapter={chapter}
                isUpdating={updatingId === chapter.id}
                showPassword={showPasswords[`chapter-${chapter.id}`] || false}
                onToggleVisibility={() =>
                  togglePasswordVisibility(`chapter-${chapter.id}`)
                }
                onUpdate={handleUpdateChapterPassword}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="flex items-start gap-2 pt-6">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold mb-1">Security Notice</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Passwords are stored in plain text for easy management</li>
              <li>Users have 5 login attempts before a 15-minute lockout</li>
              <li>JWT tokens expire after 24 hours</li>
              <li>Change passwords regularly to maintain security</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface ChapterPasswordRowProps {
  chapter: Chapter;
  isUpdating: boolean;
  showPassword: boolean;
  onToggleVisibility: () => void;
  onUpdate: (chapterId: number, password: string) => void;
}

const ChapterPasswordRow: React.FC<ChapterPasswordRowProps> = ({
  chapter,
  isUpdating,
  showPassword,
  onToggleVisibility,
  onUpdate,
}) => {
  const [password, setPassword] = useState(chapter.password || "");

  useEffect(() => {
    setPassword(chapter.password || "");
  }, [chapter.password]);

  return (
    <div className="flex gap-2 items-start p-4 border rounded-lg hover:bg-gray-50/30 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="font-medium">{chapter.name}</div>
        <div className="text-sm text-muted-foreground">{chapter.location}</div>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter chapter password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-50/50 rounded"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-end pt-8">
        <Button
          onClick={() => onUpdate(chapter.id, password)}
          disabled={isUpdating}
          size="sm"
        >
          {isUpdating ? "Updating..." : "Update"}
        </Button>
      </div>
    </div>
  );
};
