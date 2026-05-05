import { NextResponse } from "next/server";
import {
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/llm/secret";
import { readLedgerToday } from "@/lib/llm/ledger";

export const dynamic = "force-dynamic";

const SERVER_SAVE_ID_PATTERN = /^[A-Za-z0-9_.-]{0,64}$/;

export async function GET(req: Request): Promise<NextResponse> {
  if (!verifySharedSecretHeader(readSharedSecretHeader(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const serverSaveId = url.searchParams.get("serverSaveId") ?? "";
  if (!SERVER_SAVE_ID_PATTERN.test(serverSaveId)) {
    return NextResponse.json({ error: "invalid_server_save_id" }, { status: 400 });
  }

  const ledger = await readLedgerToday(serverSaveId);
  if (!ledger) {
    return NextResponse.json({ error: "kv_unavailable" }, { status: 503 });
  }
  return NextResponse.json(ledger);
}
