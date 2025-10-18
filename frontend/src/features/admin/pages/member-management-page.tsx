import React from 'react';
import { motion } from 'framer-motion';
import { MemberManagementTab } from '../components/member-management-tab';
import { useAdminData } from '../hooks/use-admin-data';

const MemberManagementPage: React.FC = () => {
  const { chapterData, handleDataRefresh } = useAdminData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 sm:space-y-8 p-4 sm:p-6"
    >
      <MemberManagementTab
        chapterData={chapterData}
        onDataRefresh={handleDataRefresh}
      />
    </motion.div>
  );
};

export default MemberManagementPage;
