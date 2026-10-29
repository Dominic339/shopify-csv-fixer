"use client";

import React, { useRef, useState, type ReactNode } from "react";

interface FileDropZoneProps {
  onFile: (file: File) => void;
  children: ReactNode;
  className?: string;
  /** Overlay text while a file is dragged over the zone. */
  dropLabel?: string;
  /** File names to accept; CSV-like text files by default. */
  accept?: RegExp;
}

const CSV_NAME = /\.(csv|txt|tsv)$/i;

export function FileDropZone({ onFile, children, className = "", dropLabel = "Drop CSV here", accept }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && (accept ? accept.test(file.name) : file.type === "text/csv" || CSV_NAME.test(file.name))) {
      onFile(file);
    }
  }

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--surface)]/90 text-sm font-semibold text-[var(--accent)]">
          {dropLabel}
        </div>
      )}
    </div>
  );
}
