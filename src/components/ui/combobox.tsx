import { useState, useRef, useCallback, useEffect } from "react";
import { Check, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface ComboboxItem {
  value: string;
  label: string;
}

interface ComboboxGroup {
  heading: string;
  items: ComboboxItem[];
}

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  items?: ComboboxItem[];
  groups?: ComboboxGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

function ScrollButtons({ listRef }: { listRef: React.RefObject<HTMLDivElement | null> }) {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 2);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, [listRef]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    checkScroll();
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", checkScroll);
    };
  }, [listRef, checkScroll]);

  const scroll = (direction: "up" | "down") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ top: direction === "up" ? -40 : 40, behavior: "smooth" });
  };

  if (!canScrollUp && !canScrollDown) return null;

  return (
    <>
      {canScrollUp && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => scroll("up")}
          className="flex w-full cursor-default items-center justify-center border-b py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      {canScrollDown && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => scroll("down")}
          className="flex w-full cursor-default items-center justify-center border-t py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </>
  );
}

export function Combobox({
  value,
  onValueChange,
  items,
  groups,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasGroups = groups && groups.length > 0;
  const allItems = hasGroups ? groups.flatMap((g) => g.items) : (items ?? []);

  const selectedLabel = allItems.find((i) => i.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <div className="relative">
            <ScrollButtons listRef={listRef} />
            <CommandList ref={listRef}>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {hasGroups
                ? groups.map((group) => (
                    <CommandGroup key={group.heading} heading={group.heading}>
                      {group.items.map((item) => (
                        <CommandItem
                          key={item.value}
                          value={item.label}
                          onSelect={() => {
                            onValueChange(item.value === value ? "" : item.value);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === item.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {item.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))
                : items?.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.label}
                      onSelect={() => {
                        onValueChange(item.value === value ? "" : item.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {item.label}
                    </CommandItem>
                  ))}
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
