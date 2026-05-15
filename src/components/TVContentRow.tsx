import { motion } from "framer-motion";
import { useRef, useEffect, isValidElement, Children } from "react";

interface TVContentRowProps {
  title: string;
  delay?: number;
  children: React.ReactNode;
  rows?: number;
  navigationDisabled?: boolean;
  focusedIndex?: number;
}

const TVContentRow = ({ title, delay = 0, children, rows = 2, focusedIndex }: TVContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cards = Children.toArray(children);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || focusedIndex === undefined) return;
    const card = container.children[focusedIndex] as HTMLElement | undefined;
    if (!card) return;
    const containerLeft = container.scrollLeft;
    const containerRight = containerLeft + container.clientWidth;
    const cardLeft = card.offsetLeft;
    const cardRight = cardLeft + card.offsetWidth;
    if (cardLeft < containerLeft) {
      container.scrollTo({ left: cardLeft, behavior: "smooth" });
    } else if (cardRight > containerRight) {
      container.scrollTo({ left: cardRight - container.clientWidth, behavior: "smooth" });
    }
  }, [focusedIndex]);

  const getGridAutoColumns = () => "calc(25% - 9px)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="mb-4 sm:mb-6"
    >
      {title && <h2 className="text-foreground font-bold text-base sm:text-lg mb-2 sm:mb-3">{title}</h2>}
      <div
        ref={scrollRef}
        className="grid gap-2 sm:gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{
          gridAutoFlow: "column",
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gridAutoColumns: getGridAutoColumns(),
          scrollbarWidth: "none",
          scrollSnapType: "x mandatory",
        }}
      >
        {cards.map((child, i) => (
          <div key={i} style={{ scrollSnapAlign: "start" }}>
            {isValidElement(child) ? child : child}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default TVContentRow;
