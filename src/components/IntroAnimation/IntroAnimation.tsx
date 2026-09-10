import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudBackground } from './CloudBackground';
import { FloatingDocuments } from './FloatingDocuments';
import { VersionTransition } from './VersionTransition';
import { FeatureCards } from './FeatureCards';
import { ProgressBar } from './ProgressBar';
import styles from './IntroAnimation.module.css';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Fecha a animação automaticamente após 6 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      finishIntro();
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const finishIntro = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 500); // Aguarda o fade-out completo para chamar o onComplete
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className={styles.container}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
        >
          <CloudBackground />
          <FloatingDocuments />

          {/* Slogan Superior */}
          <motion.div 
            className={styles.sloganArea}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.5, duration: 0.8 }}
          >
            <div className={styles.mainSlogan}>Mesma essência. Um novo patamar.</div>
            <div className={styles.subSlogan}>Centralize • Organize • Descubra • Evolua</div>
          </motion.div>

          {/* Wrapper central contendo o Transition e Features */}
          <div className={styles.contentWrapper}>
            <VersionTransition />
            <FeatureCards />
          </div>

          <ProgressBar />

          {/* Botão Pular */}
          <button className={styles.skipBtn} onClick={finishIntro}>
            Pular intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
