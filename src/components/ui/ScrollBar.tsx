import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from "react";

type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    viewportClassName?: string;
};

type ScrollBarProps = HTMLAttributes<HTMLDivElement> & {
    orientation?: "vertical" | "horizontal";
};

type ScrollbarCompensationInput = {
    hasVerticalScrollbar: boolean;
    hideScrollbar: boolean;
    scrollbarWidth: number;
};

export function getScrollbarCompensationStyle({ hasVerticalScrollbar, hideScrollbar, scrollbarWidth }: ScrollbarCompensationInput): CSSProperties {
    if (!hasVerticalScrollbar || !hideScrollbar || scrollbarWidth <= 0) return {};
    return { paddingRight: scrollbarWidth };
}

export function useScrollbarCompensation<T extends HTMLElement>(hideScrollbar = false): {
    ref: RefObject<T | null>;
    style: CSSProperties;
    hasVerticalScrollbar: boolean;
    scrollbarWidth: number;
    update: () => void;
} {
    const ref = useRef<T | null>(null);
    const [metrics, setMetrics] = useState({ hasVerticalScrollbar: false, scrollbarWidth: 0 });

    const update = useCallback(() => {
        const element = ref.current;
        if (!element) return;

        const hasVerticalScrollbar = element.scrollHeight > element.clientHeight;
        const scrollbarWidth = Math.max(0, element.offsetWidth - element.clientWidth);
        setMetrics({ hasVerticalScrollbar, scrollbarWidth });
    }, []);

    useLayoutEffect(() => {
        update();
        const element = ref.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(element);
        Array.from(element.children).forEach((child) => resizeObserver.observe(child));
        window.addEventListener("resize", update);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", update);
        };
    }, [update]);

    const style = useMemo(
        () => getScrollbarCompensationStyle({ ...metrics, hideScrollbar }),
        [hideScrollbar, metrics],
    );

    return { ref, style, ...metrics, update };
}

function joinClasses(...classes: Array<string | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function ScrollArea({ children, className, viewportClassName, ...props }: ScrollAreaProps) {
    return (
        <div className={joinClasses("relative overflow-hidden", className)} {...props}>
            <div className={joinClasses("h-full w-full overflow-auto scroll-area-viewport", viewportClassName)}>
                {children}
            </div>
            <ScrollBar orientation="vertical" />
            <ScrollBar orientation="horizontal" />
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5" style={{ backgroundColor: "rgb(var(--panel-dark))" }} />
        </div>
    );
}

export function ScrollBar({ orientation = "vertical", className, ...props }: ScrollBarProps) {
    return (
        <div
            aria-hidden="true"
            className={joinClasses(
                "pointer-events-none absolute flex select-none touch-none transition-colors",
                orientation === "vertical"
                    ? "bottom-0 right-0 top-0 w-2.5 border-l p-px"
                    : "bottom-0 left-0 right-0 h-2.5 border-t p-px",
                className,
            )}
            style={{ borderColor: "var(--border-subtle)" }}
            {...props}
        >
            <div
                className="relative flex-1 rounded-full bg-zinc-500/45 transition-colors"
                style={{ minHeight: orientation === "vertical" ? 18 : undefined, minWidth: orientation === "horizontal" ? 18 : undefined }}
            />
        </div>
    );
}
