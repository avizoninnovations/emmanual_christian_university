export type StaffProfileSection = "bioData" | "residence" | "bank" | "academic";

export interface StaffProfileField {
  key: string;
  label: string;
  group: string;
  type?: "text" | "date" | "email" | "tel" | "textarea" | "checkbox";
}

export const profileFields: Record<StaffProfileSection, StaffProfileField[]> = {
  bioData: [
    { key: "titles", label: "Title(s)", group: "Personal details" },
    { key: "firstName", label: "First name", group: "Personal details" },
    { key: "surname", label: "Surname", group: "Personal details" },
    { key: "gender", label: "Gender", group: "Personal details" },
    { key: "maritalStatus", label: "Marital status", group: "Personal details" },
    { key: "dateOfBirth", label: "Date of birth", group: "Personal details", type: "date" },
    { key: "nationalIdNumber", label: "National ID number (NIN)", group: "Identification" },
    { key: "hobbies", label: "Hobbies (comma separated)", group: "University details" },
    { key: "universityTeam", label: "University team", group: "University details" },
  ],
  residence: [
    { key: "currentCountry", label: "Current country", group: "Current residence" },
    { key: "nationality", label: "Nationality", group: "Current residence" },
    { key: "currentDistrict", label: "Current district", group: "Current residence" },
    { key: "currentCounty", label: "Current county", group: "Current residence" },
    { key: "currentSubCounty", label: "Current sub county", group: "Current residence" },
    { key: "currentParish", label: "Current parish", group: "Current residence" },
    { key: "currentVillage", label: "Current village", group: "Current residence" },
    { key: "homeDistrict", label: "Home district", group: "Home residence" },
    { key: "homeSubCounty", label: "Home sub county", group: "Home residence" },
    { key: "homeVillage", label: "Home village", group: "Home residence" },
    { key: "homeDiocese", label: "Home diocese", group: "Home residence" },
  ],
  bank: [
    { key: "bankName", label: "Bank", group: "Bank account" },
    { key: "bankAccountTitle", label: "Account title", group: "Bank account" },
    { key: "bankBranch", label: "Bank branch", group: "Bank account" },
    { key: "bankAccountNumber", label: "Account number", group: "Bank account" },
    { key: "nssfName", label: "NSSF name", group: "Statutory details" },
    { key: "nssfNumber", label: "NSSF number", group: "Statutory details" },
    { key: "tin", label: "Tax identification number (TIN)", group: "Statutory details" },
  ],
  academic: [
    { key: "biography", label: "Biography", group: "Academic information", type: "textarea" },
    { key: "researchInterests", label: "Research interests", group: "Academic information", type: "textarea" },
    { key: "profilePublished", label: "Publish academic profile", group: "Profile visibility", type: "checkbox" },
    { key: "showQualifications", label: "Show qualifications", group: "Profile visibility", type: "checkbox" },
    { key: "showExperience", label: "Show experience", group: "Profile visibility", type: "checkbox" },
    { key: "showPublications", label: "Show publications", group: "Profile visibility", type: "checkbox" },
  ],
};

export const entrySections = {
  contact: { title: "Contact information", fields: ["Contact type", "Value", "Label"] },
  bankAccount: { title: "Other bank accounts", fields: ["Bank", "Account title", "Bank branch", "Account number"] },
  qualification: { title: "Academic background", fields: ["Qualification", "Course or field of study", "Institute", "Start year", "End year"] },
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
