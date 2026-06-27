import { useState, useRef } from "react";
import type { Booking } from "../types";

export interface DragState {
  booking: Booking;
  startX: number;
  startY: number;
  originalTop: number;
  currentTop: number;
  currentStaffId: string;
  currentStaffIndex: number;
  originalStaffId: string;
  originalStart: string;
}

export interface DragCandidate {
  booking: Booking;
  initialX: number;
  initialY: number;
  originalTop: number;
  currentStaffId: string;
  currentStaffIndex: number;
  startTime: string;
  endTime: string;
  originalStaffId: string;
}

export interface ResizeState {
  booking: Booking;
  startY: number;
  originalHeight: number;
  currentHeight: number;
}

export interface UseDragDropReturn {
  dragging: DragState | null;
  setDragging: React.Dispatch<React.SetStateAction<DragState | null>>;
  dragCandidate: DragCandidate | null;
  setDragCandidate: React.Dispatch<React.SetStateAction<DragCandidate | null>>;
  resizing: ResizeState | null;
  setResizing: React.Dispatch<React.SetStateAction<ResizeState | null>>;
  justDraggedRef: React.MutableRefObject<boolean>;
  isInteracting: boolean;
}

/**
 * Encapsulates all drag-and-drop and resize state for DayView.
 * The actual mouse event handlers remain in DayView.tsx since they need
 * access to layout refs (scrollBodyRef, COL_WIDTH, SLOT_HEIGHT etc.).
 * This hook keeps the state clean and co-located.
 */
export function useDragDrop(): UseDragDropReturn {
  const [dragging, setDragging]           = useState<DragState | null>(null);
  const [dragCandidate, setDragCandidate] = useState<DragCandidate | null>(null);
  const [resizing, setResizing]           = useState<ResizeState | null>(null);

  // Tracks whether a drag just completed so the subsequent click event
  // (which always fires after mouseup) doesn't open a new-appointment slot
  const justDraggedRef = useRef(false);

  const isInteracting = !!(dragging || resizing);

  return {
    dragging, setDragging,
    dragCandidate, setDragCandidate,
    resizing, setResizing,
    justDraggedRef,
    isInteracting,
  };
}
