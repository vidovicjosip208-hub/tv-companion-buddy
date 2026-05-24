import { motion } from "framer-motion";
import { isValidElement, Children } from "react";

interface TVContentRowProps {
  title: string;
  delay?: number;
  children: React.ReactNode;
  rows?: number;
  navigationDisabled?: boolean;
  focusedIndex?: number;
}

const TVContentRow = ({ title, delay = 0, children, rows = 2 }: TVContentRowProps) => {
  const cards = Children.toArray(children);
  const visibleRows = Math.min(4, Math.max(rows, Math.ceil(cards.length / 8)));
  const visibleColumns = Math.max(1, Math.ceil(cards.length / visibleRows));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="h-full min-h-0 flex flex-col"
    >
      {title && <h2 className="text-foreground font-bold text-base sm:text-lg mb-2 sm:mb-3">{title}</h2>}
      <div
        className="grid flex-1 min-h-0 gap-2 sm:gap-3 overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${visibleRows}, minmax(0, 1fr))`,
          gridAutoFlow: "column",
        }}
      >
        {cards.map((child, i) => (
          <div key={i} className="min-h-0 min-w-0">
            {isValidElement(child) ? child : child}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default TVContentRow;
