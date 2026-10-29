import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, actions }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            onClose();
          }}
          className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
            action.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-textPrimary hover:bg-surface-muted'
          }`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
};
