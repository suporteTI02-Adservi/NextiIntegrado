import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

export const VersionTransition: React.FC = () => {
  return (
    <div className={styles.versionsContainer}>
      {/* Card 2.0 (Desaparece / Move p/ esquerda) */}
      <motion.div 
        className={styles.glassCard}
        initial={{ opacity: 0, scale: 0.8, x: 0 }}
        animate={{ 
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1, 1, 0.9],
          x: [0, 0, -100, -150] 
        }}
        transition={{ 
          times: [0, 0.2, 0.7, 1],
          duration: 4.5,
          ease: "easeInOut"
        }}
      >
        <div className={styles.versionTitleOld}>2.0</div>
        <div className={styles.badgeList}>
          <div className={styles.badge}>Funcional</div>
          <div className={styles.badge}>Estável</div>
          <div className={styles.badge}>Confiável</div>
        </div>
      </motion.div>

      {/* Setas centrais / Linhas (Aparecem no meio e somem) */}
      <motion.div
        className={styles.transitionArrow}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0, 1, 0], scale: [0, 0, 1, 0.5] }}
        transition={{ duration: 4.5, times: [0, 0.5, 0.6, 1] }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </motion.div>

      {/* Card 3.0 (Surge destacado) */}
      <motion.div 
        className={`${styles.glassCard} ${styles.glowCard}`}
        initial={{ opacity: 0, scale: 0.8, x: 50 }}
        animate={{ 
          opacity: [0, 0, 1, 1],
          scale: [0.8, 0.8, 1.05, 1],
          x: [50, 50, 0, 0] 
        }}
        transition={{ 
          times: [0, 0.6, 0.8, 1],
          duration: 4.5,
          ease: "easeOut"
        }}
      >
        <div className={styles.versionTitle}>3.0</div>
        <div className={styles.badgeList}>
          <div className={`${styles.badge} ${styles.badgeGlow}`}>Mais inteligência</div>
          <div className={`${styles.badge} ${styles.badgeGlow}`}>Mais integração</div>
          <div className={`${styles.badge} ${styles.badgeGlow}`}>Mais possibilidades</div>
        </div>
      </motion.div>
    </div>
  );
};
