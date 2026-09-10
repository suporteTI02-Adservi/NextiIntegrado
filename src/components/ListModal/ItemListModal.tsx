import React, { useState, useMemo } from 'react';
import { FaChevronLeft, FaTimes, FaCloudDownloadAlt, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { Button } from '../Button/Button';
import { getBadge } from '../ReportCard/ReportCard';
import { ItemCard, ListItemData } from './ItemCard';
import styles from './ItemListModal.module.css';

interface ItemListModalProps {
  title: string;
  collaboratorName: string;
  itemNoun: string; // ex: "as convocações" / "os relatórios" / "os holerites"
  searchPlaceholder: string; // ex: "Pesquisar convocação..." / "Pesquisar documento..."
  items: ListItemData[];
  onDownloadAll: (filteredItems: ListItemData[]) => void;
  isDownloadingAll?: boolean;
  onPrimaryAction: (item: ListItemData) => void;
  onSecondaryAction?: (item: ListItemData) => void;
  cleanHtml?: (html: string) => string;
  onBack?: () => void;
  onClose?: () => void;
  emptyStateText?: string;
}

export const ItemListModal: React.FC<ItemListModalProps> = ({
  title,
  collaboratorName,
  itemNoun,
  searchPlaceholder,
  items,
  onDownloadAll,
  isDownloadingAll = false,
  onPrimaryAction,
  onSecondaryAction,
  cleanHtml,
  onBack,
  onClose,
  emptyStateText = "Nenhum item encontrado com os filtros aplicados."
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateSort, setDateSort] = useState("newest");
  const [currentPage, setCurrentPage] = useState(0);

  // 1. Extrair tipos únicos presentes na lista para popular o dropdown
  const uniqueTypes = useMemo(() => {
    const typesSet = new Set<string>();
    items.forEach((item) => {
      const badge = getBadge(item.type || item.title || '');
      if (badge && badge.label) {
        typesSet.add(badge.label);
      }
    });
    return Array.from(typesSet);
  }, [items]);

  // 2. Filtrar e ordenar a lista
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const subMatch = (item.subtitle || '').toLowerCase().includes(q);
        const prevMatch = (item.previewText || '').toLowerCase().includes(q);
        return titleMatch || subMatch || prevMatch;
      });
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      result = result.filter((item) => {
        const badge = getBadge(item.type || item.title || '');
        return badge && badge.label === typeFilter;
      });
    }

    // Ordenação (Mais recentes vs Mais antigos)
    result.sort((a, b) => {
      // Se houver id numérico ou rawItem, usar como ordenação relativa
      const idA = typeof a.id === 'number' ? a.id : 0;
      const idB = typeof b.id === 'number' ? b.id : 0;
      if (dateSort === 'newest') {
        return idB - idA;
      } else {
        return idA - idB;
      }
    });

    return result;
  }, [items, searchQuery, typeFilter, dateSort]);

  // 3. Paginação local (8 por página)
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setCurrentPage(0);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateSort(e.target.value);
    setCurrentPage(0);
  };

  return (
    <section className={styles.container}>
      {/* Cabeçalho do Modal: Apenas 1 botão de fechar/voltar se fornecido */}
      {(onClose || onBack) && (
        <div className={styles.topNavigation}>
          {onClose ? (
            <button className={styles.navBtn} onClick={onClose} title="Fechar" aria-label="Fechar">
              <FaTimes />
            </button>
          ) : (
            <button className={styles.navBtn} onClick={onBack!} title="Voltar" aria-label="Voltar">
              <FaChevronLeft />
            </button>
          )}
        </div>
      )}

      {/* 3. Título do modal */}
      <h2 className={styles.modalTitle}>{title}</h2>

      {/* 4. Descrição abaixo do título */}
      <p className={styles.modalDescription}>
        Abaixo estão {itemNoun} extraídos para o colaborador <strong>{collaboratorName || 'N/A'}</strong> ({filteredItems.length} de {items.length} no total).
      </p>

      {/* 5. Linha de filtros em ordem estrita */}
      <div className={styles.filtersRow}>
        {/* 1. Campo de busca */}
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={handleSearchChange}
          className={styles.controlSearch}
        />

        {/* 2. Dropdown "Todos os Tipos" */}
        <select
          value={typeFilter}
          onChange={handleTypeChange}
          className={styles.controlSelect}
        >
          <option value="all">Todos os Tipos</option>
          {uniqueTypes.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>

        {/* 3. Dropdown de ordenação */}
        <select
          value={dateSort}
          onChange={handleSortChange}
          className={styles.controlSelect}
        >
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
        </select>

        {/* 4. Botão de ação principal, alinhado à direita */}
        <div className={styles.downloadBtnContainer}>
          <Button
            variant="primary"
            onClick={() => onDownloadAll(filteredItems)}
            disabled={isDownloadingAll || filteredItems.length === 0}
            style={{ padding: '0.6rem 1.4rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <FaCloudDownloadAlt /> {isDownloadingAll ? "Baixando..." : `Baixar Todos (${filteredItems.length})`}
          </Button>
        </div>
      </div>

      {/* 6. Grid de cards */}
      <div className={styles.cardsGrid}>
        {paginatedItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onPrimaryAction={onPrimaryAction}
            onSecondaryAction={onSecondaryAction}
            cleanHtml={cleanHtml}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className={styles.emptyState}>
            <p>{emptyStateText}</p>
          </div>
        )}
      </div>

      {/* Paginação se houver mais de uma página */}
      {totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <Button
            variant="icon"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
            disabled={currentPage === 0}
          >
            <FaArrowLeft />
          </Button>

          <span>
            Página {currentPage + 1} de {totalPages} {currentPage === totalPages - 1 && "(última página)"}
          </span>

          <Button
            variant="icon"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            <FaArrowRight />
          </Button>
        </div>
      )}
    </section>
  );
};
