import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Settings,
  Users,
  UserPlus,
  ChevronDown,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { formatNumber } from "@/lib/utils";

interface ChapterOption {
  chapterId: string;
  chapterName: string;
  memberCount: number;
}

interface SharedNavigationProps {
  totalMembers?: number;
  biggestChapter?: { chapterName: string; memberCount: number };
  chapters?: ChapterOption[];
  selectedChapterId?: string;
  onChapterSelect?: (chapterId: string) => void;
  onAdminLogin?: () => void;
}

export const SharedNavigation: React.FC<SharedNavigationProps> = ({
  totalMembers,
  biggestChapter,
  chapters = [],
  selectedChapterId,
  onChapterSelect,
  onAdminLogin,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const adminSubTabs = [
    {
      id: "bulk",
      label: "Bulk Operations",
      icon: UserPlus,
      path: "/admin/bulk",
    },
    {
      id: "chapters",
      label: "Chapter Management",
      icon: Building2,
      path: "/admin/chapters",
    },
    {
      id: "members",
      label: "Member Management",
      icon: Users,
      path: "/admin/members",
    },
  ];

  const isAdminPage = location.pathname.startsWith("/admin");
  const currentTab = isAdminPage ? "admin" : "dashboard";

  const selectedChapter = chapters.find(
    (c) => c.chapterId === selectedChapterId,
  );

  return (
    <div className="relative flex items-center justify-between gap-4">
      {/* Left Side Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Back Arrow Button - shows when not on landing page */}
        <AnimatePresence>
          {location.pathname !== "/" && (
            <motion.button
              onClick={() => navigate("/")}
              className="relative p-2 rounded-lg font-semibold text-foreground hover:bg-secondary/50 transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Chapter Dropdown - shown on landing page only */}
        {currentTab === "dashboard" &&
          location.pathname === "/" &&
          chapters.length > 0 &&
          onChapterSelect && (
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="relative px-4 py-2 rounded-lg font-semibold transition-colors text-foreground"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {selectedChapter
                        ? selectedChapter.chapterName
                        : "Select Chapter"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  <motion.div
                    layoutId="navigationActiveTab"
                    className="absolute inset-0 bg-secondary/20 rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px]">
                {chapters.map((chapter) => (
                  <DropdownMenuItem
                    key={chapter.chapterId}
                    onClick={() => {
                      onChapterSelect(chapter.chapterId);
                      navigate(`/chapter/${chapter.chapterId}`);
                      setIsDropdownOpen(false);
                    }}
                    className={
                      chapter.chapterId === selectedChapterId
                        ? "bg-secondary"
                        : ""
                    }
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{chapter.chapterName}</span>
                      <span className="text-xs text-muted-foreground">
                        {chapter.memberCount} members
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        {/* Admin Operations Button - shows when not on admin page and not on landing */}
        <AnimatePresence>
          {!isAdminPage && location.pathname !== "/" && (
            <motion.button
              onClick={() => navigate("/admin/bulk")}
              className="relative px-4 py-2 rounded-lg font-semibold text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Operations</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Admin Login Button - shows on landing page only */}
        <AnimatePresence>
          {location.pathname === "/" && onAdminLogin && (
            <motion.button
              onClick={onAdminLogin}
              className="relative px-4 py-2 rounded-lg font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Login</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Center - App Title */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold hidden md:block">
            BNI PALMS Analytics
          </h1>
        </button>
      </div>

      {/* Right Side - Stats & Theme */}
      {totalMembers !== undefined && (
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 px-3 py-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatNumber(totalMembers)}</span>
            <span className="text-xs opacity-80 hidden sm:inline">
              Total Members
            </span>
          </Badge>
          {biggestChapter && biggestChapter.chapterName && (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 px-3 py-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-semibold truncate max-w-[120px]">
                {biggestChapter.chapterName}
              </span>
              <span className="text-xs opacity-80 hidden sm:inline">
                ({biggestChapter.memberCount})
              </span>
            </Badge>
          )}
          <ThemeToggle />
        </motion.div>
      )}
      {totalMembers === undefined && <ThemeToggle />}
    </div>
  );
};
