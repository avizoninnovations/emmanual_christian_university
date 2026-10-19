import { StaffWorkspaceView } from "@/modules/dashboard/ui/views/staff-workspace-view";

export default async function StaffWorkspacePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <StaffWorkspaceView workspace={workspace} />;
}
