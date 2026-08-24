import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("Health check DB connectivity failed", error);
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
