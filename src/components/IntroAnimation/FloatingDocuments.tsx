import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

const docs = [
  { label: 'PDF', className: styles.doc1, delay: 0.2 },
  { label: 'DOC', className: styles.doc2, delay: 0.45 },
  { label: 'XLS', className: styles.doc3, delay: 0.7 },
  { label: 'IMG', className: styles.doc4, delay: 0.95 },
  { label: 'TXT', className: styles.doc5, delay: 1.2 },
];

export const FloatingDocuments: React.FC = () => (
  <div className={styles.floatingDocs} aria-hidden="true">
    {docs.map((doc) => (
      <motion.div
        key={doc.label}
        className={styles.docIcon + ' ' + doc.className}
        initial={{ opacity: 0, scale: 0.45 }}
        animate={{ opacity: [0, 0.82, 0.68, 0], scale: [0.45, 1, 0.82, 0.35] }}
        transition={{ duration: 5.2, delay: doc.delay, times: [0, 0.18, 0.72, 1], ease: 'easeInOut' }}
      >
        <span className={styles.docFold} />
        {doc.label}
      </motion.div>
    ))}
  </div>
);