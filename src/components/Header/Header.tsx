import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <h1>Convo</h1>
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        title={isDarkMode ? "Mudar para Claro" : "Mudar para Escuro"}
        type="button"
      >
        {isDarkMode ? <FaSun color="#FFD43B" /> : <FaMoon />}
      </button>
    </header>
  );
};
