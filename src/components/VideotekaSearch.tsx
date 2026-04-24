import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Delete, Space, Search } from "lucide-react";
import StarryBackground from "@/components/StarryBackground";
import { ContentItem } from "@/data/videotekaContent";
import { cn } from "@/lib/utils";

const keyboardRows = [
  ["a", "b", "c", "d", "e", "f"],
  ["g", "h", "i", "j", "k", "l"],
  ["m", "n", "o", "p", "q", "r"],
  ["s", "t", "u", "v", "w", "x"],
  ["y", "z", "1", "2", "3", "4"],
  ["5", "6", "7", "8", "9", "0"],
];

// Special keys row at top: space and backspace
const SPACE_KEY = "SPACE";
const BACKSPACE_KEY = "BACKSPACE";

interface VideotekaSearchProps {
  allItems: ContentItem[];
  onClose: () => void;
}

const ITEM_HEIGHT = 200; // approximate height of each grid row (aspect 2:3 card + gap)
const VISIBLE_OFFSET = 0; // keep focused row at top

const VideotekaSearch = ({ allItems, onClose }: VideotekaSearchProps) => {
  const [query, setQuery] = useState("");
  const [focusArea, setFocusArea] = useState<"keyboard" | "results">("keyboard");
  const [kbRow, setKbRow] = useState(0); // 0 = special row, 1-6 = letter rows
  const [kbCol, setKbCol] = useState(0);
  const [resultRow, setResultRow] = useState(0);
  const [resultCol, setResultCol] = useState(0);

  const filteredItems =
    query.length > 0 ? allItems.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())) : allItems;

  const resultCols = 4;
  const totalResultRows = Math.ceil(filteredItems.length / resultCols);

  const handleKeyPress = useCallback((key: string) => {
    if (key === SPACE_KEY) {
      setQuery((prev) => prev + " ");
    } else if (key === BACKSPACE_KEY) {
      setQuery((prev) => prev.slice(0, -1));
    } else {
      setQuery((prev) => prev + key);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        if (focusArea === "results") {
          e.preventDefault();
          setFocusArea("keyboard");
          return;
        }
        if (focusArea === "keyboard" && e.key === "Escape") {
          e.preventDefault();
          onClose();
          return;
        }
        // Backspace on keyboard area = delete char
        if (e.key === "Backspace") {
          e.preventDefault();
          setQuery((prev) => prev.slice(0, -1));
          return;
        }
      }

      if (focusArea === "keyboard") {
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            if (kbRow === 0) {
              // Special row: space(0), backspace(1)
              if (kbCol === 0) setKbCol(1);
              else {
                // Move to results
                setFocusArea("results");
                setResultRow(0);
                setResultCol(0);
              }
            } else {
              if (kbCol < keyboardRows[kbRow - 1].length - 1) {
                setKbCol(kbCol + 1);
              } else {
                setFocusArea("results");
                setResultRow(0);
                setResultCol(0);
              }
            }
            break;
          case "ArrowLeft":
            e.preventDefault();
            if (kbCol > 0) setKbCol(kbCol - 1);
            break;
          case "ArrowDown":
            e.preventDefault();
            if (kbRow < keyboardRows.length) {
              setKbRow(kbRow + 1);
              setKbCol(
                Math.min(kbCol, kbRow === 0 ? 5 : keyboardRows[Math.min(kbRow, keyboardRows.length - 1)].length - 1),
              );
            }
            break;
          case "ArrowUp":
            e.preventDefault();
            if (kbRow > 0) {
              setKbRow(kbRow - 1);
              setKbCol(
                Math.min(
                  kbCol,
                  kbRow - 1 === 0 ? 1 : keyboardRows[Math.min(kbRow - 2, keyboardRows.length - 1)].length - 1,
                ),
              );
            }
            break;
          case "Enter":
            e.preventDefault();
            if (kbRow === 0) {
              handleKeyPress(kbCol === 0 ? SPACE_KEY : BACKSPACE_KEY);
            } else {
              handleKeyPress(keyboardRows[kbRow - 1][kbCol]);
            }
            break;
        }
      } else {
        // Results area
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            if (resultCol < resultCols - 1) setResultCol(resultCol + 1);
            break;
          case "ArrowLeft":
            e.preventDefault();
            if (resultCol > 0) {
              setResultCol(resultCol - 1);
            } else {
              setFocusArea("keyboard");
            }
            break;
          case "ArrowDown":
            e.preventDefault();
            if (resultRow < totalResultRows - 1) setResultRow(resultRow + 1);
            break;
          case "ArrowUp":
            e.preventDefault();
            if (resultRow > 0) setResultRow(resultRow - 1);
            break;
          case "Enter":
            e.preventDefault();
            // Could navigate to content
            break;
        }
      }
    },
    [focusArea, kbRow, kbCol, resultRow, resultCol, totalResultRows, onClose, handleKeyPress],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      <StarryBackground />

      {/* Search query display */}
      <div className="relative z-10 flex items-center gap-2 px-8 pt-6 pb-4">
        <Search className="w-5 h-5 text-muted-foreground" />
        <span className="text-foreground text-lg font-medium tracking-wide min-h-[28px]">
          {query || <span className="text-muted-foreground">Search...</span>}
        </span>
        {filteredItems.length > 0 && query.length > 0 && (
          <span className="text-muted-foreground text-sm ml-2">{filteredItems.length} results</span>
        )}
      </div>

      <div className="relative z-10 flex flex-1 overflow-hidden px-4">
        {/* Virtual Keyboard */}
        <div className="flex-shrink-0 w-[280px] p-4">
          {/* Special keys: space + backspace */}
          <div className="flex gap-1.5 mb-1.5">
            <button
              onClick={() => handleKeyPress(SPACE_KEY)}
              className={cn(
                "flex-1 h-10 rounded flex items-center justify-center transition-colors",
                focusArea === "keyboard" && kbRow === 0 && kbCol === 0
                  ? "bg-white text-background ring-2 ring-white"
                  : "bg-white/10 text-foreground hover:bg-white/20",
              )}
            >
              <Space className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleKeyPress(BACKSPACE_KEY)}
              className={cn(
                "flex-1 h-10 rounded flex items-center justify-center transition-colors",
                focusArea === "keyboard" && kbRow === 0 && kbCol === 1
                  ? "bg-white text-background ring-2 ring-white"
                  : "bg-white/10 text-foreground hover:bg-white/20",
              )}
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Letter/number grid */}
          {keyboardRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1.5 mb-1.5">
              {row.map((key, colIdx) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={cn(
                    "flex-1 h-10 rounded text-sm font-medium transition-colors",
                    focusArea === "keyboard" && kbRow === rowIdx + 1 && kbCol === colIdx
                      ? "bg-white text-background ring-2 ring-white"
                      : "bg-white/10 text-foreground hover:bg-white/20",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Results Grid - Netflix TV style: no scroll, translate the grid */}
        <div className="flex-1 overflow-hidden p-4">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">No results found</div>
          ) : (
            <motion.div
              className="grid grid-cols-4 gap-3"
              animate={{
                y: focusArea === "results" ? -resultRow * ITEM_HEIGHT : 0,
              }}
              transition={{ type: "tween", duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {filteredItems.map((item, idx) => {
                const row = Math.floor(idx / resultCols);
                const col = idx % resultCols;
                const isFocused = focusArea === "results" && resultRow === row && resultCol === col;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
                      isFocused ? "ring-2 ring-white scale-105 z-10" : "opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VideotekaSearch;
