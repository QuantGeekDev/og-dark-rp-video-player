import { NextResponse } from "next/server";
import { codeKey, isValidCode } from "@/lib/discord-link/codes";
import { kv } from "@/lib/discord-link/kv";
import {
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/discord-link/secret";
import type { LinkRecord, StatusResponse } from "@/lib/discord-link/types";

export const dynamic = "force-dynamic";

const SERVER_SAVE_ID_PATTERN = /^[A-Za-z0-9_.-]{0,64}$/;

export async function GET(req: Request): Promise<NextResponse> {
  if (!verifySharedSecretHeader(readSharedSecretHeader(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const serverSaveId = url.searchParams.get("serverSaveId") ?? "";
  const consume = url.searchParams.get("consume") === "1";

  if (!isValidCode(code)) {
    return NextResponse.json<StatusResponse>({ status: "not_found" });
  }
  if (!SERVER_SAVE_ID_PATTERN.test(serverSaveId)) {
    return NextResponse.json({ error: "invalid_server_save_id" }, { status: 400 });
  }

  const result = await kv.get<LinkRecord>(codeKey(serverSaveId, code));
  if (!result.ok) {
    return NextResponse.json({ error: "kv_unavailable" }, { status: 503 });
  }

  const record = result.value;
  if (!record) {
    return NextResponse.json<StatusResponse>({ status: "not_found" });
  }

  if (record.expiresAt && record.expiresAt < Date.now()) {
    return NextResponse.json<StatusResponse>({ status: "expired" });
  }

  if (record.status === "pending") {
    return NextResponse.json<StatusResponse>({
      status: "pending",
      error: record.error,
    });
  }

  const response: StatusResponse = {
    status: "verified",
    discordId: record.discordId,
    discordUsername: record.discordUsername,
    rewardEligible: record.rewardEligible,
    error: record.error,
  };

  if (consume) {
    // Idempotent: ignore delete failure / missing key.
    await kv.del(codeKey(serverSaveId, code));
  }

  return NextResponse.json<StatusResponse>(response);
}
