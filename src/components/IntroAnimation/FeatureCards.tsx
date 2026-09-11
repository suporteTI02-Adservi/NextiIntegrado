import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

const features = [
  'Documentos centralizados',
  'Busca inteligente',
  'Integrações ampliadas',
  'Fluxos mais seguros',
];

export const FeatureCards: React.FC = () => (
  <div className={styles.featuresGrid}>
    {features.map((text, index) => (
      <motion.div
        key={text}
        className={styles.featureCard}
        initial={{ opacity: 0, x: 45, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 2.25 + index * 0.22, duration: 0.65, ease: 'easeOut' }}
      >
        <span className={styles.featureSpark}>✦</span>
        {text}
      </motion.div>
    ))}
  </div>
);