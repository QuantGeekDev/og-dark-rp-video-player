import type { Metadata } from "next";
import { getGuidebookData } from "@/lib/guides";
import { GuidesExplorer } from "./GuidesExplorer";

export const metadata: Metadata = {
  title: "Player Guides | OG Dark RP",
  description:
    "Searchable OG Dark RP player guides for jobs, controls, money, doors, police, crime, production, vehicles, casino, cinema, organizations, and support.",
};

export default function GuidesPage() {
  const guidebook = getGuidebookData();

  return <GuidesExplorer guidebook={guidebook} />;
}

