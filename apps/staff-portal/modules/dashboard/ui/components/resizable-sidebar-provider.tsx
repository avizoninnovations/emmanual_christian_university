"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { SidebarProvider, useSidebar } from "@workspace/ui/components/sidebar";

const SIDEBAR_WIDTH_KEY = "ecu-staff-sidebar-width";
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 360;

type ResizableSidebarProviderProps = {
  children: ReactNode;
  defaultWidth: number;
  defaultOpen?: boolean;
  iconWidth?: string;
  className?: string;
};

export function ResizableSidebarProvider({
  children,
  defaultWidth,
  defaultOpen = true,
  iconWidth = "3rem",
  className,
}: ResizableSidebarProviderProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const savedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (
      Number.isFinite(savedWidth)
      && savedWidth >= MIN_SIDEBAR_WIDTH
      && savedWidth <= MAX_SIDEBAR_WIDTH
    ) {
      setWidth(savedWidth);
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (storageReady) window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  }, [storageReady, width]);

  const resizeTo = (nextWidth: number) => {
    setWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, nextWidth)));
  };

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className={className}
      style={{ "--sidebar-width": `${width}px`, "--sidebar-width-icon": iconWidth } as CSSProperties}
    >
      {children}
      <SidebarResizeHandle width={width} onResize={resizeTo} />
    </SidebarProvider>
  );
}

function SidebarResizeHandle({ width, onResize }: { width: number; onResize: (width: number) => void }) {
  const { open, isMobile } = useSidebar();
  if (!open || isMobile) return null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onResize(event.clientX);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") onResize(width - 12);
    if (event.key === "ArrowRight") onResize(width + 12);
    if (event.key === "Home") onResize(MIN_SIDEBAR_WIDTH);
    if (event.key === "End") onResize(MAX_SIDEBAR_WIDTH);
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) event.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      title="Drag to resize sidebar"
      onPointerDown={handlePointerDown}
      onPointerMove={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) onResize(event.clientX);
      }}
      onKeyDown={handleKeyDown}
      className="fixed top-16 bottom-0 z-40 w-2 -translate-x-1/2 cursor-col-resize touch-none select-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent hover:after:bg-primary/50 focus-visible:after:bg-primary"
      style={{ left: width }}
    />
  );
}
