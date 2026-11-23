import { createContext, useContext, useState, type FC, type ReactNode } from "react";
import { cn } from "~/utils/classNames";
import Icon from "~/components/ui/Icon";

interface AccordionContextType {
  toggleItem: (id: string) => void;
  isItemActive: (id: string) => boolean;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
};

interface AccordionProps {
  children: ReactNode;
  defaultOpen?: string;
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion: FC<AccordionProps> = ({
  children,
  defaultOpen,
  allowMultiple = false,
  className = "",
}) => {
  const [activeItems, setActiveItems] = useState<string[]>(defaultOpen ? [defaultOpen] : []);

  const toggleItem = (id: string) => {
    setActiveItems((prev) => {
      if (allowMultiple) {
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  };

  const isItemActive = (id: string) => activeItems.includes(id);

  return (
    <AccordionContext.Provider value={{ toggleItem, isItemActive }}>
      <div className={`border-t border-rule ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export const AccordionItem: FC<AccordionItemProps> = ({ id, children, className = "" }) => {
  return (
    <div id={id} className={`border-b border-rule ${className}`}>
      {children}
    </div>
  );
};

interface AccordionHeaderProps {
  itemId: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const AccordionHeader: FC<AccordionHeaderProps> = ({
  itemId,
  children,
  className = "",
  icon,
  iconPosition = "right",
}) => {
  const { toggleItem, isItemActive } = useAccordion();
  const isActive = isItemActive(itemId);

  const defaultIcon = (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-[color,background-color,border-color,transform] duration-300",
        isActive
          ? "border-cobalt bg-cobalt text-paper"
          : "border-rule-strong text-ink-3 group-hover:scale-110 group-hover:border-ink-3"
      )}
    >
      <Icon name={isActive ? "minus" : "plus"} size={14} strokeWidth={2} />
    </span>
  );

  const handleClick = () => {
    toggleItem(itemId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        group w-full px-1 sm:px-2 py-5 text-left
        focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt
        transition-colors duration-200 flex items-center justify-between gap-4 cursor-pointer
        hover:text-cobalt
        ${className}
      `}
      aria-expanded={isActive}
    >
      <div className="flex min-w-0 items-center gap-3">
        {iconPosition === "left" && (icon || defaultIcon)}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {iconPosition === "right" && (icon || defaultIcon)}
    </button>
  );
};

interface AccordionContentProps {
  itemId: string;
  children: ReactNode;
  className?: string;
}

export const AccordionContent: FC<AccordionContentProps> = ({
  itemId,
  children,
  className = "",
}) => {
  const { isItemActive } = useAccordion();
  const isActive = isItemActive(itemId);

  return (
    <div
      className={`
        overflow-hidden transition-all duration-300 ease-out
        ${isActive ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}
        ${className}
      `}
      aria-hidden={!isActive}
    >
      <div className="px-1 sm:px-2 pb-5">{children}</div>
    </div>
  );
};
