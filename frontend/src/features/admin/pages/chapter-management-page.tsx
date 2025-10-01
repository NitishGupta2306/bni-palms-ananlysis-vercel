import React from 'react';
import { motion } from 'framer-motion';
import { ChapterManagementTab } from '../components/chapter-management-tab';
import { useAdminData } from '../hooks/useAdminData';

const ChapterManagementPage: React.FC = () => {
  const { chapterData, handleDataRefresh } = useAdminData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 sm:space-y-8 p-4 sm:p-6"
    >
      <ChapterManagementTab
        chapterData={chapterData}
        onDataRefresh={handleDataRefresh}
      />
    </motion.div>
  );
};

export default ChapterManagementPage;
