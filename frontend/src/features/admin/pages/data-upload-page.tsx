import React from 'react';
import { motion } from 'framer-motion';
import { DataUploadTab } from '../components/data-upload-tab';
import { useAdminData } from '../hooks/useAdminData';

const DataUploadPage: React.FC = () => {
  const {
    chapterData,
    selectedChapter,
    handleDataRefresh,
    handleChapterSelect,
  } = useAdminData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 sm:space-y-8 p-4 sm:p-6"
    >
      <DataUploadTab
        selectedChapter={selectedChapter}
        chapterData={chapterData}
        onChapterSelect={handleChapterSelect}
        onUploadSuccess={handleDataRefresh}
      />
    </motion.div>
  );
};

export default DataUploadPage;
