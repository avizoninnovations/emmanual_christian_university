import { RegistrationOverviewView } from "@/modules/academics/ui/views/registration-overview-view";

export const metadata = {
  title: "Course Registration | ECU Student Portal",
  description: "Enroll in semester course units and manage academic credit load.",
};

export default function RegistrationPage() {
  return <RegistrationOverviewView />;
}
