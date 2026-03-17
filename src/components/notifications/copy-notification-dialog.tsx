"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCopy, CheckCircle2, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import { Label } from "@/components/ui/label";

type CopyNotificationDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    content: string;
    orderId?: string | null;
};

export function CopyNotificationDialog({
    open,
    onOpenChange,
    title,
    description,
    content,
    orderId,
}: CopyNotificationDialogProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        toast.success("クリップボードにコピーしました");
    };

    const handleViewOrder = () => {
        if (orderId) {
            window.open(`/orders/${orderId}/purchase-order`, '_blank');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label className="text-xs text-muted-foreground mb-2 block">コピーする内容</Label>
                    <Textarea 
                        readOnly 
                        value={content} 
                        className="h-[300px] font-mono text-sm resize-none bg-muted/30"
                    />
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground">
                            ※この内容をコピーして、メールソフト等に貼り付けて送信してください。
                        </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {orderId && (
                            <Button variant="outline" onClick={handleViewOrder} className="gap-2 flex-1 sm:flex-none">
                                <FileText className="h-4 w-4" />
                                発注書を表示
                            </Button>
                        )}
                        <Button onClick={handleCopy} className="gap-2 flex-1 sm:flex-none">
                            <ClipboardCopy className="h-4 w-4" />
                            文面をコピー
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
