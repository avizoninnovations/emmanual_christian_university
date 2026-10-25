"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { SidebarProvider, useSidebar } from "./sidebar";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 360;

type ResizableSidebarProviderProps = {
  children: ReactNode;
  defaultWidth: number;
  defaultOpen?: boolean;
  iconWidth?: string;
  className?: string;
  storageKey?: string;
};

export function ResizableSidebarProvider({
  children,
  defaultWidth,
  defaultOpen = true,
  iconWidth = "3rem",
  className,
  storageKey = "ecu-staff-sidebar-width",
}: ResizableSidebarProviderProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const savedWidth = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(savedWidth) && savedWidth >= MIN_SIDEBAR_WIDTH && savedWidth <= MAX_SIDEBAR_WIDTH) {
      setWidth(savedWidth);
    }
    setStorageReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (storageReady) window.localStorage.setItem(storageKey, String(width));
  }, [storageKey, storageReady, width]);

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

function SidebarResizeHandle({
  width,
  onResize,
}: {
  width: number;
  onResize: (width: number) => void;
}) {
  const { open, isMobile } = useSidebar();
  if (!open || isMobile) return null;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onResize(event.clientX);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") onResize(width - 12);
    if (event.key === "ArrowRight") onResize(width + 12);
    if (event.key === "Home") onResize(MIN_SIDEBAR_WIDTH);
    if (event.key === "End") onResize(MAX_SIDEBAR_WIDTH);
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) event.preventDefault();
  }

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
      className="fixed top-16 bottom-0 z-40 w-2 -translate-x-1/2 cursor-col-resize touch-none select-none bg-transparent outline-none"
      style={{ left: width }}
    />
  );
}
