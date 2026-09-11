import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

export const VersionTransition: React.FC = () => (
  <div className={styles.versionsContainer}>
    <motion.div
      className={styles.oldVersion}
      initial={{ opacity: 0, x: -30, scale: 0.8 }}
      animate={{ opacity: [0, 0.55, 0.32, 0], x: [-30, 0, 35, 90], scale: [0.8, 1, 0.9, 0.65] }}
      transition={{ duration: 4.6, times: [0, 0.2, 0.68, 1], ease: 'easeInOut' }}
    >
      <span>2.0</span>
      <small>Base consolidada</small>
    </motion.div>

    <div className={styles.energyFlow} aria-hidden="true">
      <span /><span /><span />
    </div>

    <motion.div
      className={styles.coreScene}
      initial={{ opacity: 0, scale: 0.35, rotate: -8 }}
      animate={{ opacity: [0, 0.35, 1, 1], scale: [0.35, 0.7, 1.08, 1], rotate: [-8, 3, 0, 0] }}
      transition={{ duration: 4.7, times: [0, 0.28, 0.72, 1], ease: 'easeOut' }}
    >
      <span className={styles.orbitOne} />
      <span className={styles.orbitTwo} />
      <div className={styles.coreGlow} />
      <div className={styles.glassCard}>
        <div className={styles.versionTitle}>3.0</div>
        <div className={styles.versionCaption}>Conhecimento conectado</div>
      </div>
    </motion.div>
  </div>
);