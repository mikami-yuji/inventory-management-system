"use client";

import React from "react";
import { MobileSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, ShoppingCart, LogOut } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { signOut } from "next-auth/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar(): React.ReactElement {
    const { getTotalItems } = useCart();
    const { user, isAuthenticated } = useAuthSession();
    const itemCount = getTotalItems();

    // ログアウト処理
    const handleLogout = async (): Promise<void> => {
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="flex items-center p-4">
            <MobileSidebar />
            <div className="flex w-full justify-end gap-2">
                {/* カートアイコン */}
                <Button variant="ghost" size="icon" asChild className="relative">
                    <Link href="/orders/new">
                        <ShoppingCart className="h-5 w-5" />
                        {itemCount > 0 && (
                            <Badge
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                variant="destructive"
                            >
                                {itemCount > 99 ? "99+" : itemCount}
                            </Badge>
                        )}
                    </Link>
                </Button>

                {/* ユーザーメニュー */}
                {isAuthenticated && user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <UserCircle className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings">設定</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                ログアウト
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button variant="ghost" size="icon">
                        <UserCircle className="h-6 w-6" />
                    </Button>
                )}
            </div>
        </div>
    );
}
