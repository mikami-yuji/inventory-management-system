"use client";

import React from "react";
import { MobileSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";

export function Navbar(): React.ReactElement {
    const { getTotalItems } = useCart();
    const itemCount = getTotalItems();

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
                <Button variant="ghost" size="icon">
                    <UserCircle className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}
