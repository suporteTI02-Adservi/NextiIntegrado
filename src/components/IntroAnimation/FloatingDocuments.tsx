import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

export const FloatingDocuments: React.FC = () => {
  const docs = [
    { label: 'PDF', top: '25%', left: '15%', delay: 0.2 },
    { label: 'DOC', top: '65%', left: '20%', delay: 0.5 },
    { label: 'XLS', top: '35%', right: '15%', delay: 0.8 },
    { label: 'IMG', top: '70%', right: '22%', delay: 1.1 },
    { label: 'TXT', top: '15%', left: '40%', delay: 1.4 },
  ];

  return (
    <div className={styles.floatingDocs}>
      {docs.map((doc, i) => (
        <motion.div
          key={i}
          className={styles.docIcon}
          style={{ top: doc.top, left: doc.left, right: doc.right }}
          initial={{ opacity: 0, scale: 0.5, y: 30 }}
          animate={{ 
            opacity: [0, 1, 1], 
            scale: [0.5, 1, 1],
            y: [30, 0, -20]
          }}
          transition={{
            duration: 4,
            delay: doc.delay,
            ease: "easeOut",
            y: {
              duration: 6,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }
          }}
        >
          {doc.label}
        </motion.div>
      ))}
    </div>
  );
};
