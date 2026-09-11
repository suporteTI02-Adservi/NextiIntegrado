import React from 'react';
import styles from './IntroAnimation.module.css';

export const CloudBackground: React.FC = () => (
  <div className={styles.cloudBackground} aria-hidden="true">
    <div className={styles.cloudBank + ' ' + styles.cloudBack}>
      <span /><span /><span /><span /><span />
    </div>
    <div className={styles.cloudBank + ' ' + styles.cloudLeft}>
      <span /><span /><span /><span />
    </div>
    <div className={styles.cloudBank + ' ' + styles.cloudRight}>
      <span /><span /><span /><span />
    </div>
    <div className={styles.cloudBank + ' ' + styles.cloudFront}>
      <span /><span /><span /><span /><span />
    </div>
    <div className={styles.skyGlow} />
  </div>
);