import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  CloudUpload,
  Building2,
  Users,
  Database,
  UserPlus,
  Home,
  Shield,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MemberManagementTab } from "./member-management-tab";
import { ChapterManagementTab } from "./chapter-management-tab";
import { BulkUploadTab } from "./bulk-upload-tab";
import { DataUploadTab } from "./data-upload-tab";
import { SystemStatusTab } from "./system-status-tab";
import { SecuritySettingsTab } from "./security-settings-tab";
import { useAdminData } from "../hooks/use-admin-data";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    chapterData,
    selectedChapter,
    isLoading,
    systemStats,
    handleDataRefresh,
    handleChapterSelect,
  } = useAdminData();

  // Persist tab selection in URL and localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Try to get from URL first
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab) return urlTab;

    // Fall back to localStorage
    return localStorage.getItem("admin-active-tab") || "upload";
  });

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("admin-active-tab", value);

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 sm:space-y-8 p-4 sm:p-6"
    >
      {/* Breadcrumb Navigation */}
      <div className="px-0 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate("/")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Dashboard
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Admin Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4" />
            Data Upload
          </TabsTrigger>
          <TabsTrigger value="chapters" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Chapter Management
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Management
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System Status
          </TabsTrigger>
        </TabsList>

        {/* Data Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <DataUploadTab
            selectedChapter={selectedChapter}
            chapterData={chapterData}
            onChapterSelect={handleChapterSelect}
            onUploadSuccess={handleDataRefresh}
          />
        </TabsContent>

        {/* Chapter Management Tab */}
        <TabsContent value="chapters" className="space-y-6">
          <ChapterManagementTab
            chapterData={chapterData}
            onDataRefresh={handleDataRefresh}
          />
        </TabsContent>

        {/* Member Management Tab */}
        <TabsContent value="members" className="space-y-6">
          <MemberManagementTab
            chapterData={chapterData}
            onDataRefresh={handleDataRefresh}
          />
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <BulkUploadTab onDataRefresh={handleDataRefresh} />
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <SecuritySettingsTab />
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-6">
          <SystemStatusTab systemStats={systemStats} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminDashboard;
