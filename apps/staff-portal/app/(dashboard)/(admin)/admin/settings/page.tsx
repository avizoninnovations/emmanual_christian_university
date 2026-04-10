import { Metadata } from "next";
import { SettingsView } from "@/modules/system/ui/views/settings-view";

export const metadata: Metadata = {
  title: "Administrative Settings | ECU Staff Portal",
  description: "Manage administrative profiles and university-wide system configurations.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
