import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // Allow skipping after 1 second
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, 1000);

    // Auto-complete after 3 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Handle user interaction (click, tap, or any key press)
  const handleInteraction = useCallback(() => {
    if (canSkip) {
      onComplete();
    }
  }, [canSkip, onComplete]);

  useEffect(() => {
    // Listen for any key press
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [handleInteraction]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        onClick={handleInteraction}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-bniRed-600 via-bniRed-500 to-bniGold-500 cursor-pointer"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="flex flex-col items-center gap-8"
        >
          {/* BNI DEIRA */}
          <div className="text-center px-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white tracking-tight">
              BNI DEIRA
            </h1>
          </div>

          {/* App Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center px-4"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              PALMS Analysis
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mt-3">
              Professional Business Analytics
            </p>
          </motion.div>
        </motion.div>

        {/* Loading indicator and hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4"
        >
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-white rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          {canSkip && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-white/70 text-sm"
            >
              Click or press any key to continue
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
