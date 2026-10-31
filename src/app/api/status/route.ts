import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/store";

export function GET() {
  return NextResponse.json({ demo: isDemoMode() });
}
