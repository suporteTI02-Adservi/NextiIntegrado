import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

export const FeatureCards: React.FC = () => {
  const features = [
    { text: "Documentos centralizados", delay: 3.0 },
    { text: "Busca inteligente", delay: 3.2 },
    { text: "Integrações ampliadas", delay: 3.4 },
    { text: "Fluxos mais seguros", delay: 3.6 }
  ];

  return (
    <div className={styles.featuresGrid}>
      {features.map((feature, i) => (
        <motion.div
          key={i}
          className={styles.featureCard}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            delay: feature.delay, 
            duration: 0.6, 
            ease: "easeOut" 
          }}
        >
          <div className={styles.featureIcon}>
            {/* Minimal Check Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          {feature.text}
        </motion.div>
      ))}
    </div>
  );
};
