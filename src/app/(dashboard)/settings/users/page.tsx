
"use client";

import { useState } from "react";
import { useUsers } from "@/hooks/use-masters";
import { User } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Loader2, UserCog } from "lucide-react";
import { UserRoleDialog } from "@/components/settings/user-role-dialog";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
    const { users, isLoading, isError, mutate } = useUsers();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">ユーザー管理</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>登録ユーザー一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : isError ? (
                        <div className="text-red-500 py-4">エラーが発生しました</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>名前</TableHead>
                                    <TableHead>メールアドレス</TableHead>
                                    <TableHead>権限</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(users || []).map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center">
                                                <div className="bg-slate-100 p-1.5 rounded-full mr-3">
                                                    <UserCog className="h-4 w-4 text-slate-500" />
                                                </div>
                                                {user.name || "未設定"}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.role === 'admin' ? (
                                                <Badge className="bg-purple-500 hover:bg-purple-600">Admin</Badge>
                                            ) : user.role === 'blocked' ? (
                                                <Badge variant="destructive">Blocked</Badge>
                                            ) : (
                                                <Badge variant="outline">Client</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(user)}
                                            >
                                                <Pencil className="h-4 w-4 mr-1" /> 権限変更
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            ユーザーが見つかりません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <UserRoleDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={editingUser}
                onSuccess={() => mutate()}
            />
        </div>
    );
}
