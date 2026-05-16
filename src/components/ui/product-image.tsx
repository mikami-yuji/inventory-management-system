"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Package, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 商品画像コンポーネント
 * 遅延読み込み、エラーハンドリング、リトライ機能を備えた
 * 商品画像の表示に特化したコンポーネント
 */

type ProductImageProps = {
    /** 画像URL (Supabase Storage) */
    src: string | null | undefined;
    /** alt テキスト */
    alt: string;
    /** 表示モード: thumbnail (48x48), card (fill), detail (大きめ) */
    variant?: "thumbnail" | "card" | "detail";
    /** 追加CSSクラス */
    className?: string;
    /** クリック時のハンドラ */
    onClick?: () => void;
    /** fill モードを使用するか（card向け） */
    fill?: boolean;
    /** 幅 (thumbnail用) */
    width?: number;
    /** 高さ (thumbnail用) */
    height?: number;
};



export function ProductImage({
    src,
    alt,
    variant = "thumbnail",
    className,
    onClick,
    fill = false,
    width,
    height,
}: ProductImageProps): React.ReactElement {
    const [hasError, setHasError] = useState<boolean>(false);
    const [retryCount, setRetryCount] = useState<number>(0);

    // エラー時のリトライ処理
    const handleRetry = useCallback((e: React.MouseEvent): void => {
        e.stopPropagation();
        setHasError(false);
        setRetryCount(prev => prev + 1);
    }, []);

    // 画像読み込みエラー時
    const handleError = useCallback((): void => {
        setHasError(true);
    }, []);

    // 画像URLがない場合やエラーの場合のフォールバック
    if (!src || hasError) {
        const sizeClass = variant === "thumbnail"
            ? "w-12 h-12"
            : variant === "card"
                ? "w-full h-full"
                : "w-full h-48";

        return (
            <div
                className={cn(
                    "bg-slate-100 rounded border flex flex-col items-center justify-center text-slate-400",
                    sizeClass,
                    onClick && "cursor-pointer",
                    className
                )}
                onClick={onClick}
            >
                {hasError ? (
                    <>
                        <Package className={cn(
                            "opacity-30",
                            variant === "thumbnail" ? "h-5 w-5" : "h-8 w-8 mb-1"
                        )} />
                        {variant !== "thumbnail" && (
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 mt-1 transition-colors"
                            >
                                <RefreshCw className="h-3 w-3" />
                                再読込
                            </button>
                        )}
                    </>
                ) : (
                    <Package className={cn(
                        "opacity-30",
                        variant === "thumbnail" ? "h-5 w-5" : "h-10 w-10"
                    )} />
                )}
            </div>
        );
    }



    // リトライ用のキャッシュバスター付きURL
    const imageSrc = retryCount > 0
        ? `${src}${src.includes('?') ? '&' : '?'}_retry=${retryCount}`
        : src;

    if (fill) {
        return (
            <Image
                src={imageSrc}
                alt={alt}
                fill
                loading="lazy"
                unoptimized
                className={cn("object-cover", className)}
                onError={handleError}
            />
        );
    }

    return (
        <div
            className={cn(onClick && "cursor-pointer hover:opacity-80 transition-opacity")}
            onClick={onClick}
        >
            <Image
                src={imageSrc}
                alt={alt}
                width={width ?? 48}
                height={height ?? 48}
                loading="lazy"
                unoptimized
                className={cn(
                    variant === "thumbnail" && "w-12 h-12 object-cover rounded border",
                    className
                )}
                onError={handleError}
            />
        </div>
    );
}
