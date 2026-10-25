export type StaffWorkspace = {
  title: string;
  sections: { title: string; fields: string[] }[];
};

export const staffWorkspaces: Record<string, StaffWorkspace> = {
  finance: { title: "My Finance", sections: [
    { title: "Staff Finance", fields: ["Pay periods", "Salary statements", "Payroll notices"] },
  ] },
  "salary-payslip": { title: "Salary Pay Slip", sections: [
    { title: "Pay Statement", fields: ["Pay period", "Gross pay", "Allowances", "Deductions", "Net pay", "Statement date"] },
  ] },
  disciplinary: { title: "Staff Disciplinary", sections: [
    { title: "Case Record", fields: ["Case reference", "Notice date", "Response deadline", "Case status", "Outcome"] },
  ] },
};
