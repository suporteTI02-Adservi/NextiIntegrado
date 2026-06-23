import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { FaMoon, FaSun, FaHome, FaUsers, FaFilePdf, FaPlus, FaMoneyBillWave, FaChevronLeft } from "react-icons/fa";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isFabOpen, setIsFabOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path ? `${styles.tab} ${styles.activeTab}` : styles.tab;
  };

  return (
    <div className={styles.layout}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <h1>Nexti Integrado</h1>
        </div>
        
        <nav className={styles.tabs}>
          <Link to="/" className={isActive("/")}>
            <FaHome /> Menu
          </Link>
        </nav>

        <div className={styles.actions}>
          <button className={styles.themeToggle} onClick={toggleTheme} title="Alternar Tema">
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>
      
      <main className={styles.content}>
        {location.pathname !== "/" && (
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <FaChevronLeft /> Voltar
          </button>
        )}
        {children}
      </main>

      {/* Floating Action Button */}
      <div className={styles.fabContainer}>
        <div className={`${styles.fabMenu} ${isFabOpen ? styles.fabMenuOpen : ''}`}>
          <div className={styles.fabItemWrapper}>
            <span className={styles.fabLabel}>Convocações</span>
            <div 
              className={styles.fabItem} 
              onClick={() => { navigate('/nexti'); setIsFabOpen(false); }}
            >
              <FaUsers />
            </div>
          </div>
          <div className={styles.fabItemWrapper}>
            <span className={styles.fabLabel}>Documentos</span>
            <div 
              className={styles.fabItem} 
              onClick={() => { navigate('/documentos'); setIsFabOpen(false); }}
            >
              <FaFilePdf />
            </div>
          </div>
          <div className={styles.fabItemWrapper}>
            <span className={styles.fabLabel}>Holerite & 13º</span>
            <div 
              className={styles.fabItem} 
              onClick={() => { navigate('/documentos?tipo=holerite'); setIsFabOpen(false); }}
            >
              <FaMoneyBillWave />
            </div>
          </div>
        </div>
        <button 
          className={`${styles.fabMain} ${isFabOpen ? styles.fabMainOpen : ''}`}
          onClick={() => setIsFabOpen(!isFabOpen)}
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
};
