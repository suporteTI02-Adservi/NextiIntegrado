import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

export const ProgressBar: React.FC = () => {
  return (
    <motion.div 
      className={styles.progressBarContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.progressText}>Preparando uma nova experiência...</div>
      <div className={styles.progressTrack}>
        <motion.div 
          className={styles.progressFill}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
};
