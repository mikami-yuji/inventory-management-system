"use client";

/**
 * 画像アップロードコンポーネント
 * ブラウザ側で圧縮してからSupabase Storageにアップロード
 */

import React, { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageUploadProps = {
    value?: string; // 現在の画像URL
    onChange: (url: string | null) => void; // URLが変更されたときのコールバック
    disabled?: boolean;
    bucket?: string; // Storageバケット名（デフォルト: product-images）
    folder?: string; // フォルダパス（例: products）
};

// 圧縮オプション
const compressionOptions = {
    maxSizeMB: 0.2, // 最大200KB
    maxWidthOrHeight: 800, // 最大幅/高さ
    useWebWorker: true,
    fileType: "image/webp" as const, // WebP形式で保存（軽量）
};

export function ImageUpload({
    value,
    onChange,
    disabled = false,
    bucket = "product-images",
    folder = "products",
}: ImageUploadProps): React.ReactElement {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(value || null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ファイル選択ハンドラ
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 画像ファイルかチェック
        if (!file.type.startsWith("image/")) {
            setError("画像ファイルを選択してください");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            // 1. 画像を圧縮
            console.log("元のサイズ:", (file.size / 1024).toFixed(2), "KB");
            const compressedFile = await imageCompression(file, compressionOptions);
            console.log("圧縮後のサイズ:", (compressedFile.size / 1024).toFixed(2), "KB");

            // プレビュー表示
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl);

            // 2. Supabase Storageにアップロード
            const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;

            const { data, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, compressedFile, {
                    contentType: "image/webp",
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            // 3. 公開URLを取得
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            onChange(publicUrlData.publicUrl);
        } catch (err) {
            console.error("アップロードエラー:", err);
            setError(err instanceof Error ? err.message : "アップロードに失敗しました");
            setPreview(value || null);
        } finally {
            setUploading(false);
            // input をリセット（同じファイルを再選択可能に）
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    };

    // 画像削除ハンドラ
    const handleRemove = (): void => {
        setPreview(null);
        onChange(null);
        setError(null);
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={disabled || uploading}
                className="hidden"
            />

            {/* プレビューエリア */}
            {preview ? (
                <div className="relative inline-block">
                    <img
                        src={preview}
                        alt="プレビュー"
                        className="w-32 h-32 object-cover rounded-lg border"
                    />
                    {!disabled && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={handleRemove}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            ) : (
                <div
                    className={cn(
                        "w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && !uploading && inputRef.current?.click()}
                >
                    {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                        <>
                            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-xs text-muted-foreground">画像を選択</span>
                        </>
                    )}
                </div>
            )}

            {/* アップロードボタン（画像がある場合は変更用） */}
            {preview && !disabled && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            アップロード中...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            画像を変更
                        </>
                    )}
                </Button>
            )}

            {/* エラー表示 */}
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}

            {/* 圧縮情報 */}
            <p className="text-xs text-muted-foreground">
                ※ 画像は自動的に圧縮されます（最大200KB, 800px）
            </p>
        </div>
    );
}
