
"use client";

import { useState, useEffect } from "react";
import { User, UserRole } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface UserRoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
    onSuccess: () => void;
}

export function UserRoleDialog({
    open,
    onOpenChange,
    user,
    onSuccess,
}: UserRoleDialogProps) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<UserRole>("client");
    const [receivesOrderEmails, setReceivesOrderEmails] = useState(false);

    useEffect(() => {
        if (open && user) {
            setRole(user.role);
            setReceivesOrderEmails(user.receivesOrderEmails ?? false);
        }
    }, [open, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            const res = await fetch("/api/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: user.id, role, receivesOrderEmails }),
            });

            if (!res.ok) throw new Error("Failed to update role");

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>権限変更</DialogTitle>
                    <DialogDescription>
                        {user?.name} さんの権限を変更します。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            権限
                        </Label>
                        <Select
                            value={role}
                            onValueChange={(val) => setRole(val as UserRole)}
                            disabled={loading}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="権限を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="client">Client (利用者)</SelectItem>
                                <SelectItem value="admin">Admin (管理者)</SelectItem>
                                <SelectItem value="blocked">Blocked (ブロック中)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="receives-emails" className="text-right leading-tight">
                            注文通知<br />メール受信
                        </Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Switch
                                id="receives-emails"
                                checked={receivesOrderEmails}
                                onCheckedChange={setReceivesOrderEmails}
                                disabled={loading}
                            />
                            <Label htmlFor="receives-emails" className="text-sm font-normal text-muted-foreground">
                                管理者宛の発注通知を受信する
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
