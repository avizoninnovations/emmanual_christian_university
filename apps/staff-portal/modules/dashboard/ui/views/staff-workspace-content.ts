export type StaffWorkspace = {
  title: string;
  sections: { title: string; fields: string[] }[];
};

export const staffWorkspaces: Record<string, StaffWorkspace> = {
  memos: { title: "My Memos", sections: [
    { title: "Inbox", fields: ["Reference", "Sender", "Date received", "Priority", "Read status"] },
    { title: "Sent", fields: ["Recipients", "Subject", "Date sent", "Delivery status"] },
  ] },
  finance: { title: "My Finance", sections: [
    { title: "Staff Finance", fields: ["Pay periods", "Salary statements", "Payroll notices"] },
  ] },
  "salary-payslip": { title: "Salary Pay Slip", sections: [
    { title: "Pay Statement", fields: ["Pay period", "Gross pay", "Allowances", "Deductions", "Net pay", "Statement date"] },
  ] },
  "my-evaluation": { title: "My Evaluation", sections: [
    { title: "Evaluation Cycle", fields: ["Cycle", "Objectives", "Progress", "Reviewer feedback", "Development actions", "Status"] },
  ] },
  "supervisor-evaluation": { title: "Evaluate Supervisors", sections: [
    { title: "Supervisor Feedback", fields: ["Evaluation period", "Supervisor", "Question set", "Response status", "Submission date"] },
  ] },
  "leave-application": { title: "Leave Application", sections: [
    { title: "Request Details", fields: ["Leave type", "Start and end dates", "Reason", "Handover plan", "Approval status"] },
  ] },
  "leave-calendar": { title: "Leave Calendar", sections: [
    { title: "Calendar", fields: ["Date range", "Leave type", "Request status", "Approver"] },
  ] },
  "exit-application": { title: "Exit Application", sections: [
    { title: "Exit Request", fields: ["Proposed last day", "Reason", "Handover", "Clearance items", "Approval status"] },
  ] },
  disciplinary: { title: "Staff Disciplinary", sections: [
    { title: "Case Record", fields: ["Case reference", "Notice date", "Response deadline", "Case status", "Outcome"] },
  ] },
  complaints: { title: "My Complaints", sections: [
    { title: "Complaints", fields: ["Reference", "Category", "Date submitted", "Status", "Response"] },
  ] },
  defenses: { title: "My Defenses", sections: [
    { title: "Defense Response", fields: ["Case reference", "Notice", "Response due", "Response", "Attachments", "Status"] },
  ] },
  "e-learning-courses": { title: "E-Learning Courses", sections: [
    { title: "Online Courses", fields: ["Course unit", "Online course", "Enrollment", "Learning platform status"] },
  ] },
  "aegrotat-units": { title: "Special Assessment Applications", sections: [
    { title: "Applications", fields: ["Student", "Course unit", "Circumstance", "Supporting evidence", "Review status"] },
  ] },
  "faculty-central": { title: "Faculty Central", sections: [
    { title: "Faculty Workspace", fields: ["Faculty", "Department", "Staff responsibilities"] },
  ] },
};
