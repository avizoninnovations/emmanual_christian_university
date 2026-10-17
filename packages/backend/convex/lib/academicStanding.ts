export function getDegreeClassification(cgpa: number): {
  classification: string;
  standing: "Good Standing" | "Academic Probation" | "Ineligible";
} {
  if (cgpa >= 3.6) return { classification: "First Class Honours", standing: "Good Standing" };
  if (cgpa >= 3) return { classification: "Second Class Honours (Upper Division)", standing: "Good Standing" };
  if (cgpa >= 2.5) return { classification: "Second Class Honours (Lower Division)", standing: "Good Standing" };
  if (cgpa >= 2) return { classification: "Pass Degree", standing: "Good Standing" };
  return { classification: "Fail / Ineligible for Award", standing: "Academic Probation" };
}
