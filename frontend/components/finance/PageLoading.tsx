"use client";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageLoading() { return <div className="loading-grid" role="status" aria-label="Carregando finanças"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>; }
