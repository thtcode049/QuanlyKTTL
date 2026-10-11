import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: dataStore.branches,
  });
}
