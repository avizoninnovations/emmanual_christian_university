export type StaffWorkspaceDefinition = {
  title: string;
  summary: string;
  sections: { title: string; description: string; fields: string[] }[];
};

const alphaPersonalWorkspace = "This destination appears in Alpha’s staff menu. ECU has the workspace and navigation shell; live records and actions are not connected yet.";

export const staffWorkspaces: Record<string, StaffWorkspaceDefinition> = {
  memos: { title: "My Memos", summary: alphaPersonalWorkspace, sections: [
    { title: "Inbox", description: "Memos addressed to you, with read status and priority.", fields: ["Reference", "Sender", "Date received", "Priority", "Read status"] },
    { title: "Sent", description: "Memos you have created or sent for review.", fields: ["Recipients", "Subject", "Date sent", "Delivery status"] },
  ] },
  finance: { title: "My Finance", summary: alphaPersonalWorkspace, sections: [
    { title: "Staff finance", description: "A place for personal payroll and finance documents.", fields: ["Pay periods", "Salary statements", "Payroll notices"] },
  ] },
  "salary-payslip": { title: "Salary Pay Slip", summary: alphaPersonalWorkspace, sections: [
    { title: "Pay statement", description: "A staff member’s statement for a selected payroll period.", fields: ["Pay period", "Gross pay", "Allowances", "Deductions", "Net pay", "Statement date"] },
  ] },
  "my-evaluation": { title: "My Evaluation", summary: alphaPersonalWorkspace, sections: [
    { title: "Evaluation cycle", description: "Review goals and evaluation feedback for each cycle.", fields: ["Cycle", "Objectives", "Progress", "Reviewer feedback", "Development actions", "Status"] },
  ] },
  "supervisor-evaluation": { title: "Evaluate Supervisors", summary: alphaPersonalWorkspace, sections: [
    { title: "Supervisor feedback", description: "Review open evaluation periods and submitted responses.", fields: ["Evaluation period", "Supervisor", "Question set", "Response status", "Submission date"] },
  ] },
  "leave-application": { title: "Leave Application", summary: alphaPersonalWorkspace, sections: [
    { title: "Request details", description: "A request should show its dates, coverage plan, and approval progress.", fields: ["Leave type", "Start and end dates", "Reason", "Handover plan", "Approval status"] },
  ] },
  "leave-calendar": { title: "Leave Calendar", summary: alphaPersonalWorkspace, sections: [
    { title: "Calendar view", description: "Browse leave dates and the status of your requests.", fields: ["Date range", "Leave type", "Request status", "Approver"] },
  ] },
  "exit-application": { title: "Exit Application", summary: alphaPersonalWorkspace, sections: [
    { title: "Exit request", description: "Track a submitted request and the required clearance steps.", fields: ["Proposed last day", "Reason", "Handover", "Clearance items", "Approval status"] },
  ] },
  disciplinary: { title: "Staff Disciplinary", summary: alphaPersonalWorkspace, sections: [
    { title: "Case record", description: "A private view of notices, deadlines, responses, and case progress.", fields: ["Case reference", "Notice date", "Response deadline", "Case status", "Outcome"] },
  ] },
  complaints: { title: "My Complaints", summary: alphaPersonalWorkspace, sections: [
    { title: "Complaint tracking", description: "Review submitted complaints and their response status.", fields: ["Reference", "Category", "Date submitted", "Status", "Response"] },
  ] },
  defenses: { title: "My Defenses", summary: alphaPersonalWorkspace, sections: [
    { title: "Defense response", description: "Track response deadlines and supporting documents for a case.", fields: ["Case reference", "Notice", "Response due", "Response", "Attachments", "Status"] },
  ] },
  "my-teaching": { title: "My Teaching", summary: "Teaching tools are grouped here so course, attendance, timetable, and reporting work is easy to reach.", sections: [
    { title: "Teaching overview", description: "Live course and class tools are available in the academic workspace.", fields: ["Assigned Courses", "Class Attendance", "Teaching Timetable", "Teaching Cover"] },
  ] },
  "teaching-reports": { title: "My Teaching Reports", summary: "Alpha’s report page offers Moodle Utilization and Student Evaluation views, semester filters, a report load action, and tabular view. This ECU page is a navigation and information outline; it is not yet connected to reporting data.", sections: [
    { title: "Report views", description: "Choose a report type and review the result for a Semester.", fields: ["Moodle Utilization", "Student Evaluation", "Academic Period", "Tabular view"] },
  ] },
  meals: { title: "Meals", summary: alphaPersonalWorkspace, sections: [
    { title: "Meal information", description: "A staff view for meal access and related notices.", fields: ["Meal schedule", "Eligibility", "Meal notices"] },
  ] },
  "faculty-central": { title: "Faculty Central", summary: "Alpha lists Faculty Central as a staff workspace. ECU’s single-university structure will use Faculty and Department records rather than campus-specific records.", sections: [
    { title: "Faculty workspace", description: "The destination is available while faculty-level tools are being mapped.", fields: ["Faculty", "Department", "Staff responsibilities"] },
  ] },
  results: { title: "Results", summary: "Results review tools are available to staff with academic leadership access. Broader results workflows will be added as their data and permissions are mapped.", sections: [
    { title: "Results workspace", description: "Leadership users can access the live review queue and broadsheet from the Academic Leadership menu.", fields: ["Course results", "Review status", "Semester", "Approval history"] },
  ] },
  procurement: { title: "Procurement", summary: "This Alpha staff menu destination is included for review. No procurement workflow is connected in ECU yet.", sections: [
    { title: "Procurement workspace", description: "A future request flow can organize submissions and approvals.", fields: ["Request", "Items", "Justification", "Approvals", "Status"] },
  ] },
  inventory: { title: "Inventory", summary: "This Alpha staff menu destination is included for review. No inventory workflow is connected in ECU yet.", sections: [
    { title: "Inventory workspace", description: "A future staff view can show assigned equipment and requests.", fields: ["Asset", "Assigned staff", "Condition", "Issue report", "Status"] },
  ] },
  vehicles: { title: "Vehicles", summary: "This Alpha staff menu destination is included for review. No vehicle workflow is connected in ECU yet.", sections: [
    { title: "Vehicle workspace", description: "A future booking view can organize trips and approvals.", fields: ["Trip date", "Destination", "Purpose", "Vehicle", "Approval status"] },
  ] },
  "alpha-extras": { title: "Alpha Extras", summary: "This Alpha staff menu destination is included for review. Its tools need to be identified before ECU connects any workflows.", sections: [
    { title: "University tools", description: "This section is reserved for additional staff links after review.", fields: ["Available tools", "Guidance", "Support links"] },
  ] },
};
