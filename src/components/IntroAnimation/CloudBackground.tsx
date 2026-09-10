import React from 'react';
import { motion } from 'framer-motion';
import styles from './IntroAnimation.module.css';

export const CloudBackground: React.FC = () => {
  return (
    <div className={styles.cloudBackground}>
      {/* Nuvens SVG minimalistas com Parallax */}
      <motion.svg
        initial={{ x: '-10%', opacity: 0 }}
        animate={{ x: '5%', opacity: 0.8 }}
        transition={{ duration: 8, ease: "linear" }}
        style={{ position: 'absolute', top: '20%', left: '-10%', width: '400px', fill: '#e2e8f0' }}
        viewBox="0 0 24 24"
      >
        <path d="M17.5 19c-2.48 0-4.5-2.02-4.5-4.5 0-.25.02-.5.06-.74C12.16 13.3 11.13 13 10 13c-2.76 0-5 2.24-5 5s2.24 5 5 5h7.5c1.93 0 3.5-1.57 3.5-3.5S19.43 19 17.5 19z" />
      </motion.svg>
      
      <motion.svg
        initial={{ x: '10%', opacity: 0 }}
        animate={{ x: '-5%', opacity: 0.6 }}
        transition={{ duration: 10, ease: "linear" }}
        style={{ position: 'absolute', top: '50%', right: '-5%', width: '500px', fill: '#f1f5f9' }}
        viewBox="0 0 24 24"
      >
        <path d="M17.5 19c-2.48 0-4.5-2.02-4.5-4.5 0-.25.02-.5.06-.74C12.16 13.3 11.13 13 10 13c-2.76 0-5 2.24-5 5s2.24 5 5 5h7.5c1.93 0 3.5-1.57 3.5-3.5S19.43 19 17.5 19z" />
      </motion.svg>
      
      <motion.svg
        initial={{ x: '-5%', opacity: 0 }}
        animate={{ x: '10%', opacity: 0.4 }}
        transition={{ duration: 12, ease: "linear" }}
        style={{ position: 'absolute', bottom: '10%', left: '20%', width: '300px', fill: '#e2e8f0' }}
        viewBox="0 0 24 24"
      >
        <path d="M17.5 19c-2.48 0-4.5-2.02-4.5-4.5 0-.25.02-.5.06-.74C12.16 13.3 11.13 13 10 13c-2.76 0-5 2.24-5 5s2.24 5 5 5h7.5c1.93 0 3.5-1.57 3.5-3.5S19.43 19 17.5 19z" />
      </motion.svg>
    </div>
  );
};
