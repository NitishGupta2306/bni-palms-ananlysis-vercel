import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Settings, Users, UserPlus, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatNumber } from '@/lib/utils';

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
}

export const SharedNavigation: React.FC<SharedNavigationProps> = ({
  totalMembers,
  biggestChapter,
  chapters = [],
  selectedChapterId,
  onChapterSelect,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const adminSubTabs = [
    { id: 'bulk', label: 'Bulk Operations', icon: UserPlus, path: '/admin/bulk' },
    { id: 'chapters', label: 'Chapter Management', icon: Building2, path: '/admin/chapters' },
    { id: 'members', label: 'Member Management', icon: Users, path: '/admin/members' }
  ];

  const isAdminPage = location.pathname.startsWith('/admin');
  const currentTab = isAdminPage ? 'admin' : 'dashboard';

  const selectedChapter = chapters.find(c => c.chapterId === selectedChapterId);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Chapter Dropdown - shown on dashboard */}
        {currentTab === 'dashboard' && chapters.length > 0 && onChapterSelect ? (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <motion.button
                className={`relative px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentTab === 'dashboard'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {selectedChapter ? selectedChapter.chapterName : 'Select Chapter'}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {currentTab === 'dashboard' && (
                  <motion.div
                    layoutId="navigationActiveTab"
                    className="absolute inset-0 bg-secondary/20 rounded-lg -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              {chapters.map((chapter) => (
                <DropdownMenuItem
                  key={chapter.chapterId}
                  onClick={() => {
                    onChapterSelect(chapter.chapterId);
                    setIsDropdownOpen(false);
                  }}
                  className={chapter.chapterId === selectedChapterId ? 'bg-secondary' : ''}
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
        ) : (
          /* Chapter Dashboard button - shown when no chapters or in admin */
          <motion.button
            onClick={() => navigate('/')}
            className={`relative px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentTab === 'dashboard'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              opacity: isAdminPage ? 0.5 : 1,
              scale: isAdminPage ? 0.9 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Chapter Dashboard</span>
            </div>
            {currentTab === 'dashboard' && (
              <motion.div
                layoutId="navigationActiveTab"
                className="absolute inset-0 bg-secondary/20 rounded-lg -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        )}

        {/* Admin Operations Button - shows when not on admin page */}
        <AnimatePresence>
          {!isAdminPage && (
            <motion.button
              onClick={() => navigate('/admin/bulk')}
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

        {/* Separator - shows when admin is active */}
        <AnimatePresence>
          {isAdminPage && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="text-muted-foreground text-sm px-2">|</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Sub-Tabs - expand when admin is active */}
        <AnimatePresence mode="popLayout">
          {isAdminPage && adminSubTabs.map((subTab, index) => {
            const SubIcon = subTab.icon;
            const isSubActive = location.pathname === subTab.path;
            return (
              <motion.button
                key={subTab.id}
                onClick={() => navigate(subTab.path)}
                className={`relative px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isSubActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.03,
                  ease: 'easeOut'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <SubIcon className="h-4 w-4" />
                  <span className="hidden lg:inline text-sm">{subTab.label}</span>
                </div>
                {isSubActive && (
                  <motion.div
                    layoutId="navigationActiveTab"
                    className="absolute inset-0 bg-secondary/20 rounded-lg -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {totalMembers !== undefined && (
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatNumber(totalMembers)}</span>
            <span className="text-xs opacity-80 hidden sm:inline">Total Members</span>
          </Badge>
          {biggestChapter && biggestChapter.chapterName && (
            <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-semibold truncate max-w-[120px]">{biggestChapter.chapterName}</span>
              <span className="text-xs opacity-80 hidden sm:inline">({biggestChapter.memberCount})</span>
            </Badge>
          )}
        </motion.div>
      )}
    </div>
  );
};
