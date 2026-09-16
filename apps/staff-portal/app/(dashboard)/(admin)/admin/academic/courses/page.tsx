import { CoursesManagerView } from "@/modules/courses/ui/views/courses-manager-view";

export const metadata = {
  title: "Course Catalog | ECU Admin",
  description: "University course catalog, credit allocations, and curriculum requirements.",
};

export default function CoursesPage() {
  return <CoursesManagerView />;
}
