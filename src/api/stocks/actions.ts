"use server";

import { stockService } from "@/src/application/stocks/stock.service";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
}

export async function addToWatchlistAction(symbol: string) {
  const userId = await getAuthenticatedUser();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = await stockService.addStockToWatchlist(userId, symbol);
  
  if (result.success) {
    revalidatePath("/watchlist");
    return { success: true };
  }

  return { success: false, error: result.error.message };
}

export async function removeFromWatchlistAction(symbol: string) {
  const userId = await getAuthenticatedUser();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = await stockService.removeStockFromWatchlist(userId, symbol);

  if (result.success) {
    revalidatePath("/watchlist");
    return { success: true };
  }

  return { success: false, error: result.error.message };
}

export async function getWatchlistAction() {
  const userId = await getAuthenticatedUser();
  if (!userId) return { success: false, error: "Unauthorized", data: [] };

  const result = await stockService.getUserWatchlist(userId);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error.message, data: [] };
}
