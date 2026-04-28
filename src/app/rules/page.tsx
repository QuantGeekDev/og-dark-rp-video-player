import type { Metadata } from "next";
import { getRulebookData } from "@/lib/server-rules";
import { RulesExplorer } from "./RulesExplorer";

export const metadata: Metadata = {
  title: "Server Rules | OG Dark RP",
  description:
    "Searchable OG Dark RP server rules for roleplay, crime, government, jobs, vehicles, organizations, media, and support.",
};

export default function RulesPage() {
  const rulebook = getRulebookData();

  return <RulesExplorer rulebook={rulebook} />;
}
