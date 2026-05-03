import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import StarryBackground from "@/components/StarryBackground";
import VideotekaHeader, { VideotekaHeaderHandle } from "@/components/VideotekaHeader";
import ContentRow from "@/components/ContentRow";
import ContentDetails from "@/components/ContentDetails";
import ContentDetailView from "@/components/ContentDetailView";
import VideotekaSearch from "@/components/VideotekaSearch";
import { ContentRowData, defaultDetails } from "@/data/videotekaContent";
import { useVideotekaContent } from "@/hooks/useVideotekaContent";

interface VideotekaLayoutProps {
  initialTab?: string;
}

const EMPTY_ROWS: ContentRowData[] = [{ title: "Učitavanje", items: [] }];

const VideotekaLayout = ({ initialTab = "Home" }: VideotekaLayoutProps) => {
  const { data: vt, isLoading } = useVideotekaContent();
  const tabRowsMap = vt?.rowsByTab ?? {};
  const detailsData = vt?.detailsById ?? {};
  const allContentItems = vt?.allItems ?? [];
  const navigate = useNavigate();
  const headerRef = useRef<VideotekaHeaderHandle>(null);
  const headerFocusedIndexRef = useRef<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [focusedRow, setFocusedRow] = useState(0);
  const [headerFocused, setHeaderFocused] = useState(true);
  const [rowTransitioning, setRowTransitioning] = useState(false);

  useEffect(() => {
    setTimeout(() => headerRef.current?.focus(1), 100);
  }, []);

  const [detailViewOpen, setDetailViewOpen] = useState(false);

  const rows = useMemo(() => tabRowsMap[activeTab] ?? tabRowsMap.Home ?? EMPTY_ROWS, [activeTab, tabRowsMap]);

  const [focusedItems, setFocusedItems] = useState<number[]>(rows.map(() => 0));

  useEffect(() => {
    setFocusedRow(0);
    setFocusedItems(rows.map(() => 0));
    setDetailViewOpen(false);
  }, [activeTab, rows]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (detailViewOpen) {
        if (e.key === "Backspace" || e.key === "Escape") {
          e.preventDefault();
          setDetailViewOpen(false);
        }
        return;
      }

      if (headerFocused) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedItems((prev) => {
            const next = [...prev];
            next[focusedRow] = Math.min(next[focusedRow] + 1, rows[focusedRow].items.length - 1);
            return next;
          });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedItems((prev) => {
            const next = [...prev];
            next[focusedRow] = Math.max(next[focusedRow] - 1, 0);
            return next;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedRow((prev) => {
            const next = Math.min(prev + 1, rows.length - 1);
            if (next !== prev) {
              setRowTransitioning(true);
              setTimeout(() => setRowTransitioning(false), 100);
            }
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusedRow === 0) {
            headerRef.current?.focus();
          } else {
            setRowTransitioning(true);
            setTimeout(() => setRowTransitioning(false), 100);
            setFocusedRow((prev) => prev - 1);
          }
          break;
        case "Backspace":
        case "Escape":
          e.preventDefault();
          navigate("/");
          break;
        case "Enter":
          e.preventDefault();
          setDetailViewOpen(true);
          break;
      }
    },
    [focusedRow, navigate, rows, detailViewOpen, headerFocused],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentRow = rows[focusedRow];
  const currentItem = currentRow?.items[focusedItems[focusedRow] ?? 0];
  const details = detailsData[currentItem?.id || ""] || defaultDetails;
  const nextRow = focusedRow + 1 < rows.length ? focusedRow + 1 : null;
  const hasContent = !!currentRow && currentRow.items.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="h-screen overflow-hidden relative"
    >
      <StarryBackground />
      <VideotekaHeader
        ref={headerRef}
        activeTab={activeTab}
        onSearchOpen={() => setSearchOpen(true)}
        onFocusChange={(focused, index) => {
          setHeaderFocused(focused);
          headerFocusedIndexRef.current = focused ? (index ?? null) : null;
        }}
        onTabChange={handleTabChange}
      />
      {searchOpen && <VideotekaSearch allItems={allContentItems} onClose={() => setSearchOpen(false)} />}
      {!hasContent ? (
        <div className="flex h-[60vh] items-center justify-center text-white/60 text-sm sm:text-base px-4 text-center">
          {isLoading ? "Učitavanje sadržaja…" : "Nema sadržaja u Videoteci."}
        </div>
      ) : (
        <div className="-mt-[15px] sm:-mt-[25px] lg:-mt-[35px]">
          <ContentRow
            title={currentRow!.title}
            titleHighlight={currentRow!.titleHighlight}
            items={currentRow!.items}
            focusedIndex={focusedItems[focusedRow] ?? 0}
            isActive={!headerFocused}
            uniform={headerFocused || rowTransitioning}
            showIndicator={focusedRow === 0 && !headerFocused}
            onItemClick={(i) => {
              setFocusedItems((prev) => {
                const next = [...prev];
                next[focusedRow] = i;
                return next;
              });
            }}
          />
          <ContentDetails {...details} />
          {nextRow !== null && rows[nextRow] && (
            <ContentRow
              title={rows[nextRow].title}
              titleHighlight={rows[nextRow].titleHighlight}
              items={rows[nextRow].items}
              peek
              portrait
              focusedIndex={focusedItems[nextRow] ?? 0}
              onItemClick={(i) => {
                setFocusedRow(nextRow);
                setFocusedItems((prev) => {
                  const next = [...prev];
                  next[nextRow] = i;
                  return next;
                });
              }}
            />
          )}
        </div>
      )}
      <AnimatePresence>
        {detailViewOpen && currentItem && (
          <ContentDetailView
            details={details}
            thumbnail={currentItem.thumbnail}
            itemId={currentItem.id}
            onClose={() => setDetailViewOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideotekaLayout;
