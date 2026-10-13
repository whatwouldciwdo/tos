"use client";

import { useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div className="neu-modal fixed inset-0 z-50 flex items-center justify-center p-4 text-white">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative neu-card ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg neu-btn text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}: AlertModalProps) {
  const icons = {
    success: <CheckCircle size={48} className="text-[#42ff6b]" />,
    error: <AlertCircle size={48} className="text-red-500" />,
    warning: <AlertTriangle size={48} className="text-yellow-500" />,
    info: <Info size={48} className="text-blue-500" />,
  };

  const defaultTitles = {
    success: "Berhasil",
    error: "Error",
    warning: "Peringatan",
    info: "Informasi",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center space-y-4">
        <div className="flex justify-center">{icons[type]}</div>
        <h3 className="text-xl font-semibold text-white">
          {title || defaultTitles[type]}
        </h3>
        <p className="text-gray-300 whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 neu-btn-accent rounded-xl font-semibold"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Ya",
  cancelText = "Batal",
  type = "info",
}: ConfirmModalProps) {
  const icons = {
    danger: <AlertCircle size={48} className="text-red-500" />,
    warning: <AlertTriangle size={48} className="text-yellow-500" />,
    info: <Info size={48} className="text-blue-500" />,
  };

  const confirmButtonClasses = {
    danger: "neu-btn text-red-400 border border-red-500/40",
    warning: "neu-btn text-yellow-400 border border-yellow-500/40",
    info: "neu-btn-accent",
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center space-y-4">
        <div className="flex justify-center">{icons[type]}</div>
        {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
        <p className="text-gray-300 whitespace-pre-line">{message}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 neu-btn text-gray-200 rounded-xl font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors ${confirmButtonClasses[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  defaultValue = "",
  placeholder = "",
  confirmText = "OK",
  cancelText = "Batal",
}: PromptModalProps) {
  const [value, setValue] = React.useState(defaultValue);

  // Reset value when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-4">
        {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
        <p className="text-gray-300 whitespace-pre-line">{message}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full px-4 py-3 neu-inset text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#42ff6b]/50"
          style={{ color: "#ffffff" }}
          autoFocus
        />
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 neu-btn text-gray-200 rounded-xl font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 neu-btn-accent rounded-xl font-semibold"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Add missing React import at the top
import React from "react";
