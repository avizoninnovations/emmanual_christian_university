export type StaffProfileSection = "bioData" | "residence" | "bank" | "academic";

export interface StaffProfileField {
  key: string;
  label: string;
  type?: "text" | "date" | "email" | "tel" | "textarea" | "checkbox";
}

export const profileFields: Record<StaffProfileSection, StaffProfileField[]> = {
  bioData: [
    { key: "titles", label: "Title(s)" },
    { key: "firstName", label: "First name" },
    { key: "surname", label: "Surname" },
    { key: "gender", label: "Gender" },
    { key: "maritalStatus", label: "Marital status" },
    { key: "dateOfBirth", label: "Date of birth", type: "date" },
    { key: "nationalIdNumber", label: "National ID number (NIN)" },
    { key: "hobbies", label: "Hobbies (comma separated)" },
    { key: "universityTeam", label: "University team" },
  ],
  residence: [
    { key: "currentCountry", label: "Current country" },
    { key: "nationality", label: "Nationality" },
    { key: "currentDistrict", label: "Current district" },
    { key: "currentCounty", label: "Current county" },
    { key: "currentSubCounty", label: "Current sub county" },
    { key: "currentParish", label: "Current parish" },
    { key: "currentVillage", label: "Current village" },
    { key: "homeDistrict", label: "Home district" },
    { key: "homeSubCounty", label: "Home sub county" },
    { key: "homeVillage", label: "Home village" },
    { key: "homeDiocese", label: "Home diocese" },
  ],
  bank: [
    { key: "bankName", label: "Bank" },
    { key: "bankAccountTitle", label: "Account title" },
    { key: "bankBranch", label: "Bank branch" },
    { key: "bankAccountNumber", label: "Account number" },
    { key: "nssfName", label: "NSSF name" },
    { key: "nssfNumber", label: "NSSF number" },
    { key: "tin", label: "Tax identification number (TIN)" },
  ],
  academic: [
    { key: "biography", label: "Biography", type: "textarea" },
    { key: "researchInterests", label: "Research interests", type: "textarea" },
    { key: "profilePublished", label: "Publish academic profile", type: "checkbox" },
    { key: "showQualifications", label: "Show qualifications", type: "checkbox" },
    { key: "showExperience", label: "Show experience", type: "checkbox" },
    { key: "showPublications", label: "Show publications", type: "checkbox" },
  ],
};

export const entrySections = {
  contact: { title: "Contact information", fields: ["Contact type", "Value", "Label"] },
  bankAccount: { title: "Other bank accounts", fields: ["Bank", "Account title", "Bank branch", "Account number"] },
  qualification: { title: "Academic background", fields: ["Qualification", "Institution", "Award", "Start year", "End year", "Country"] },
  experience: { title: "Work experience", fields: ["Position", "Employer", "Department", "Start date", "End date", "Responsibilities"] },
  employment: { title: "Employment history", fields: ["Movement type", "Position", "Unit", "Division", "Job type", "Start date", "End date"] },
  publication: { title: "Publications", fields: ["Title", "Publication type", "Journal or publisher", "Year", "Link"] },
  nextOfKin: { title: "Next of kin", fields: ["Full name", "Relationship", "Phone", "Email", "Address"] },
  spouse: { title: "Spouse", fields: ["Full name", "Phone", "Email", "Occupation", "Address"] },
  child: { title: "Children", fields: ["Full name", "Date of birth", "Gender"] },
  parent: { title: "Parents", fields: ["Full name", "Relationship", "Phone", "Email", "Address"] },
  document: { title: "Documents", fields: ["Document type", "Document name", "Notes", "Expiry date"] },
} as const;

export type EntrySection = keyof typeof entrySections;
