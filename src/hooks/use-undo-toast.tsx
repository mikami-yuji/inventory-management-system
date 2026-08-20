"use client";

import React, { useCallback } from "react";
import toast from "react-hot-toast";

type UndoToastOptions = {
    message: string;
    undoLabel?: string;
    duration?: number;
    onUndo: () => Promise<void> | void;
};

/**
 * Undo（元に戻す）操作が可能なトースト通知を提供するカスタムフック
 */
export function useUndoToast() {
    const showUndoToast = useCallback(({
        message,
        undoLabel = "元に戻す",
        duration = 6000,
        onUndo
    }: UndoToastOptions) => {
        toast((t) => (
            <div className="flex items-center justify-between gap-3 min-w-[240px]">
                <span className="text-sm font-medium text-foreground">{message}</span>
                <button
                    type="button"
                    onClick={async () => {
                        toast.dismiss(t.id);
                        try {
                            await onUndo();
                            toast.success("元に戻しました", { duration: 3000 });
                        } catch (error) {
                            console.error("Undo error:", error);
                            toast.error("元に戻せませんでした");
                        }
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors whitespace-nowrap"
                >
                    {undoLabel}
                </button>
            </div>
        ), {
            duration,
            position: "bottom-right",
            style: {
                background: "var(--card, #ffffff)",
                color: "var(--card-foreground, #0f172a)",
                border: "1px solid var(--border, #e2e8f0)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
            },
        });
    }, []);

    return { showUndoToast };
}
