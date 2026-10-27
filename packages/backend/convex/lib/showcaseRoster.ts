import type { Id } from "../_generated/dataModel.js";

export const SHOWCASE_COHORT_SIZE = 22;

const firstNames = [
  "Ajak", "Atem", "Deng", "Grace", "James", "Joy", "Kiden", "Lado",
  "Mary", "Martha", "Moses", "Nyamal", "Peter", "Rebecca", "Samuel",
  "Sarah", "Taban", "Wani", "Yai", "Akot", "Agok", "Emmanuel",
];
const surnames = [
  "Akol", "Atem", "Deng", "Jada", "Juma", "Kenyi", "Kiden", "Lado",
  "Loki", "Mabior", "Moro", "Ngor", "Pitia", "Samuel", "Taban",
  "Teny", "Wani", "Yai", "Ariik", "Bol", "Gatluak", "Makuach",
];

export type ShowcaseStudent = {
  userId: string;
  registrationNumber: string;
  accessNumber: string;
  loginEmail?: string;
  programId: Id<"programs">;
  firstName: string;
  surname: string;
  otherName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  nationality: string;
  address: string;
  phone: string;
  contactEmail: string;
  emergencyContact: { name: string; relationship: string; phone: string };
  yearOfEntry: number;
  programType: "Day";
  yearOfStudy: number;
  currentPeriodId: Id<"academicPeriods">;
  term: number;
  year: number;
};

export function buildShowcaseStudent(args: {
  programId: Id<"programs">;
  programIndex: number;
  studentIndex: number;
  registrationNumber: string;
  accessNumber: string;
  currentPeriodId: Id<"academicPeriods">;
  userId: string;
  loginEmail?: string;
}): ShowcaseStudent {
  const firstName = firstNames[(args.studentIndex + args.programIndex) % firstNames.length]!;
  const surname = surnames[(args.studentIndex * 3 + args.programIndex) % surnames.length]!;
  const gender = args.studentIndex % 2 === 0 ? "female" : "male";
  const yearOfBirth = 2001 + (args.studentIndex % 6);

  return {
    userId: args.userId,
    registrationNumber: args.registrationNumber,
    accessNumber: args.accessNumber,
    loginEmail: args.loginEmail,
    programId: args.programId,
    firstName,
    surname,
    otherName: firstNames[(args.studentIndex + 8) % firstNames.length]!,
    gender,
    dateOfBirth: `${yearOfBirth}-0${(args.studentIndex % 8) + 1}-15`,
    nationality: "South Sudanese",
    address: "Yei River County, South Sudan",
    phone: `+211 920 200 ${String(args.programIndex * SHOWCASE_COHORT_SIZE + args.studentIndex + 1).padStart(3, "0")}`,
    contactEmail: args.loginEmail ?? `student.${args.accessNumber.toLowerCase()}@students.example.test`,
    emergencyContact: {
      name: `${firstNames[(args.studentIndex + 5) % firstNames.length]} ${surname}`,
      relationship: "Parent",
      phone: `+211 920 300 ${String(args.programIndex * SHOWCASE_COHORT_SIZE + args.studentIndex + 1).padStart(3, "0")}`,
    },
    yearOfEntry: 2026,
    programType: "Day",
    yearOfStudy: 1,
    currentPeriodId: args.currentPeriodId,
    term: 2,
    year: 2026,
  };
}
