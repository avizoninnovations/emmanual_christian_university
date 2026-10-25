"use client";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { toast } from "sonner";
import { AlertCircle, BookOpen, CheckCircle2, FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

const shell = "w-full space-y-6 p-5 sm:p-6 lg:p-8";
const inputClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function PageHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{note}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const approved = status === "approved";
  const rejected = status === "rejected" || status === "returned";
  const label = status === "submitted" ? "With lecturer" : status === "under_review" ? "In review" : status === "rejected" ? "Declined" : status.replaceAll("_", " ");
  return <Badge variant="outline" className={approved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : rejected ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{label.replaceAll("_", " ")}</Badge>;
}

async function uploadFile(url: string, file: File): Promise<Id<"_storage">> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
  if (!response.ok) throw new Error("File upload failed. Please try again.");
  const body = await response.json() as { storageId: Id<"_storage"> };
  return body.storageId;
}

export function AegrotatView() {
  const data = useQuery(api.student_services.getMyAegrotatApplications, {});
  const submit = useMutation(api.student_services.submitAegrotatApplication);
  const getUploadUrl = useMutation(api.student_services.generateStudentUploadUrl);
  const [courseId, setCourseId] = useState("");
  const [applicationType, setApplicationType] = useState<"illness" | "bereavement" | "other">("illness");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!courseId) return toast.error("Select a registered course unit.");
    setBusy(true);
    try {
      const attachmentId = file ? await uploadFile(await getUploadUrl({}), file) : undefined;
      await submit({ courseId: courseId as Id<"courses">, applicationType, reason, attachmentId });
      setReason(""); setCourseId(""); setFile(null); setApplicationType("illness");
      toast.success("Special assessment application sent to your lecturer.");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit application.")); }
    finally { setBusy(false); }
  }

  return <div className={shell}>
    <PageHeading eyebrow="Registration" title="Special Assessment Application" note="Ask your course lecturer to review an assessment affected by illness or other exceptional circumstances." />
    {!data ? <Loading /> : <>
      <Card className="border-blue-100 bg-blue-50/70 shadow-none"><CardContent className="flex gap-3 p-4 text-sm text-blue-900"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>Select the course unit, explain what happened, and attach evidence if you have it. The lecturer assigned to that unit reviews your application; it does not go to the HOD.</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">New Application</CardTitle><CardDescription>{data.period?.name ?? "Current semester"}</CardDescription></CardHeader><CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <label><span className={labelClass}>Enrolled course unit</span><select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputClass}><option value="">Choose a course unit</option>{data.courses.filter((course) => course !== null).map((course) => <option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select></label>
          <label><span className={labelClass}>Circumstance</span><select required value={applicationType} onChange={(e) => setApplicationType(e.target.value as typeof applicationType)} className={inputClass}><option value="illness">Illness</option><option value="bereavement">Bereavement</option><option value="other">Other exceptional circumstance</option></select></label>
          <label><span className={labelClass}>Supporting evidence (optional)</span><input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${inputClass} py-2`} /></label>
          <label className="md:col-span-2"><span className={labelClass}>What happened?</span><textarea required minLength={10} value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Describe the circumstance and which assessment it affected." /></label>
          <div className="md:col-span-2"><Button disabled={busy || data.courses.length === 0}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Send to lecturer</Button></div>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Your applications</CardTitle></CardHeader><CardContent className="space-y-3">
        {data.applications.length === 0 ? <Empty message="You have not submitted an assessment application." /> : data.applications.map((item) => <div key={item._id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium text-slate-800">{item.courseTitle} · {(item.applicationType ?? "other").replaceAll("_", " ")}</p><p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm text-slate-500">{item.reason}</p><p className="mt-1 text-xs text-slate-500">Submitted {new Date(item.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p>{item.attachmentUrl && <a className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 underline" href={item.attachmentUrl} target="_blank" rel="noreferrer"><FileText className="size-3.5" /> View supporting evidence</a>}{item.reviewNote && <p className="mt-2 text-sm text-rose-700">Lecturer note: {item.reviewNote}</p>}</div><StatusBadge status={item.status} /></div>)}
      </CardContent></Card>
    </>}
  </div>;
}

export function DeadSemesterView() {
  const requests = useQuery(api.student_services.getMyDeadSemesterRequests, {});
  const submit = useMutation(api.student_services.submitDeadSemesterRequest);
  const getUploadUrl = useMutation(api.student_services.generateStudentUploadUrl);
  const [targetYear, setTargetYear] = useState("");
  const [targetTerm, setTargetTerm] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const attachmentId = file ? await uploadFile(await getUploadUrl({}), file) : undefined;
      await submit({ targetYear: Number(targetYear), targetTerm: Number(targetTerm), reason, attachmentId });
      setReason(""); setTargetYear(""); setTargetTerm(""); setFile(null); toast.success("Request submitted for review.");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit request.")); }
    finally { setBusy(false); }
  }

  return <div className={shell}><PageHeading eyebrow="Registration" title="Dead Year / Dead Semester" note="Request a return to study or a review of a missed semester." />
    <Card><CardHeader><CardTitle className="text-base">New Request</CardTitle><CardDescription>Choose the year and semester you are requesting consideration for.</CardDescription></CardHeader><CardContent><form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label><span className={labelClass}>Academic Year</span><input required type="number" min="1" max="10" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className={inputClass} placeholder="Year of study" /></label>
      <label><span className={labelClass}>Semester</span><select required value={targetTerm} onChange={(e) => setTargetTerm(e.target.value)} className={inputClass}><option value="">Select semester</option><option value="1">Semester 1</option><option value="2">Semester 2</option><option value="3">Semester 3</option></select></label>
      <label className="md:col-span-2"><span className={labelClass}>Reason</span><textarea required minLength={10} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-slate-200 p-3 text-sm" /></label>
      <label><span className={labelClass}>Supporting Document (Optional)</span><input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${inputClass} py-2`} /></label>
      <div className="flex items-end"><Button disabled={busy}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Submit Request</Button></div>
    </form></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Previous Requests</CardTitle></CardHeader><CardContent className="space-y-3">{!requests ? <Loading /> : requests.length === 0 ? <Empty message="No dead year or dead semester requests." /> : requests.map((request) => <div key={request._id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">Year {request.targetYear} · Semester {request.targetTerm}</p><p className="mt-1 text-sm text-slate-500">{request.reason}</p></div><StatusBadge status={request.status} /></div>)}</CardContent></Card>
  </div>;
}

export function RetakeView() {
  const data = useQuery(api.student_services.getMyRetakeOptions, {});
  const register = useMutation(api.student_services.registerRetakeCourse);
  const [busy, setBusy] = useState<string | null>(null);
  async function enroll(courseId: Id<"courses">) {
    setBusy(courseId);
    try {
      const result = await register({ courseId });
      toast.success(result.status === "pending_approval" ? "Off-semester retake submitted for approval." : "Retake course registered.");
    }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not register retake.")); }
    finally { setBusy(null); }
  }
  return <div className={shell}><PageHeading eyebrow="Registration" title="Retake Registration" note="Retake failed course units within your program limit. Off-semester retakes require HOD or Registrar approval." />
    {!data ? <Loading /> : <Card><CardHeader><CardTitle className="text-base">Eligible Courses</CardTitle><CardDescription>{data.period?.name ?? "No active semester"}</CardDescription></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2"><p><span className="font-medium">On-semester:</span> {data.usage.onSemester} of {data.limits.onSemester} used</p><p><span className="font-medium">Off-semester:</span> {data.usage.offSemester} of {data.limits.offSemester} used</p></div>
      {data.courses.length === 0 ? <Empty message="No approved results currently require a retake." /> : data.courses.map((course) => {
        const registration = data.registrations.find((item) => item.courseId === course.id);
        const isOffSemester = course.mode === "off_semester";
        return <div key={course.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="rounded-md bg-primary/10 p-2 text-primary"><BookOpen className="size-4" /></span><div><p className="font-medium">{course.title}</p><p className="text-xs text-muted-foreground">{course.code} · {course.creditUnits} CU · Previous grade {course.grade}</p><p className="mt-1 text-xs text-muted-foreground">{isOffSemester ? "Off-semester retake — approval required" : "On-semester retake — registers immediately"}</p></div></div>{registration ? <StatusBadge status={registration.status} /> : <Button disabled={busy === course.id || !data.period} onClick={() => enroll(course.id)}>{busy === course.id && <Loader2 className="mr-2 size-4 animate-spin" />}{isOffSemester ? "Request Approval" : "Register Retake"}</Button>}</div>;
      })}</CardContent></Card>}
  </div>;
}

const evaluationQuestions = ["The lecturer communicated course content clearly.", "The lecturer was prepared and organized for classes.", "The lecturer encouraged participation and questions.", "Assessment and feedback supported my learning.", "The lecturer treated students fairly and respectfully."];

export function EvaluationView() {
  const data = useQuery(api.student_services.getMyEvaluationOptions, {});
  const submit = useMutation(api.student_services.submitLecturerEvaluation);
  const [active, setActive] = useState<string | null>(null);
  const [ratings, setRatings] = useState<number[]>(Array(5).fill(0));
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent, item: NonNullable<typeof data>["evaluations"][number]) {
    event.preventDefault(); if (ratings.some((rating) => rating === 0)) return toast.error("Rate each statement before submitting.");
    setBusy(true);
    try { await submit({ courseId: item.courseId, lecturerId: item.lecturerId, responses: evaluationQuestions.map((question, index) => ({ question, rating: ratings[index] ?? 0 })), comment: comment || undefined }); setActive(null); setComment(""); setRatings(Array(5).fill(0)); toast.success("Evaluation submitted."); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit evaluation.")); }
    finally { setBusy(false); }
  }
  return <div className={shell}><PageHeading eyebrow="Evaluation" title="Academic Staff Evaluation" note="Share feedback on staff teaching your registered course units." />
    {!data ? <Loading /> : <><Card className="border-blue-100 bg-blue-50/70 shadow-none"><CardContent className="p-4 text-sm text-blue-900">{data.period ? `Select a lecturer from ${data.period.name} (${data.period.year}), then evaluate each course unit they taught you.` : "No active semester is available for evaluation."}</CardContent></Card>
      {data.evaluations.length === 0 ? <Card><CardContent className="py-12 text-center"><BookOpen className="mx-auto mb-3 size-9 text-slate-400" /><p className="font-medium">No lecturers found.</p><p className="mt-1 text-sm text-slate-500">Lecturer assignments for your enrolled courses will appear here.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{data.evaluations.map((item) => { const key = `${item.courseId}:${item.lecturerId}`; return <Card key={key}><CardHeader className="pb-3"><CardTitle className="text-base">{item.lecturerName}</CardTitle><CardDescription>{item.courseCode} · {item.courseTitle}</CardDescription></CardHeader><CardContent>{item.submitted ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 size-3.5" />Evaluation submitted</Badge> : active === key ? <form onSubmit={(event) => onSubmit(event, item)} className="space-y-4">{evaluationQuestions.map((question, index) => <fieldset key={question}><legend className="mb-2 text-sm text-slate-700">{question}</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map((rating) => <label key={rating} className={`flex size-9 cursor-pointer items-center justify-center rounded-md border text-sm ${ratings[index] === rating ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200"}`}><input className="sr-only" type="radio" name={`${key}-${index}`} value={rating} checked={ratings[index] === rating} onChange={() => setRatings((old) => old.map((value, i) => i === index ? rating : value))} />{rating}</label>)}</div></fieldset>)}<label className="block"><span className={labelClass}>Optional Comment</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} className="w-full rounded-md border p-3 text-sm" /></label><div className="flex gap-2"><Button disabled={busy}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Submit Evaluation</Button><Button type="button" variant="outline" onClick={() => setActive(null)}>Cancel</Button></div></form> : <Button onClick={() => { setActive(key); setRatings(Array(5).fill(0)); }}>Evaluate Lecturer</Button>}</CardContent></Card>; })}</div>}
    </>}
  </div>;
}

export function InternshipView() {
  const data = useQuery(api.student_services.getMyInternship, {});
  const savePlacement = useMutation(api.student_services.saveMyInternshipPlacement);
  const addTask = useMutation(api.student_services.addInternshipLogbookTask);
  const addContact = useMutation(api.student_services.addInternshipAgencyContact);
  const removeContact = useMutation(api.student_services.removeInternshipAgencyContact);
  const getUploadUrl = useMutation(api.student_services.generateStudentUploadUrl);
  const [tab, setTab] = useState<"letter" | "logbook">("letter");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [placement, setPlacement] = useState({ organization: "", country: "", district: "", location: "", startDate: "", endDate: "", phone: "", email: "", supervisorName: "", supervisorPhone: "", supervisorEmail: "" });
  const [task, setTask] = useState({ date: "", activity: "", lessonLearned: "", skills: "", challenges: "" });
  const [contact, setContact] = useState({ name: "", title: "", phone: "", email: "" });
  useEffect(() => {
    if (data === undefined || hasHydrated) return;
    if (data.placement) {
      const { organization, country, district, location, startDate, endDate, phone, email, supervisorName, supervisorPhone, supervisorEmail } = data.placement;
      setPlacement({ organization, country, district, location, startDate, endDate, phone, email, supervisorName, supervisorPhone, supervisorEmail });
    }
    setHasHydrated(true);
  }, [data, hasHydrated]);
  async function onSavePlacement(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const acceptanceLetterId = file ? await uploadFile(await getUploadUrl({}), file) : undefined; await savePlacement({ ...placement, ...(acceptanceLetterId ? { acceptanceLetterId } : {}) }); setFile(null); toast.success("Internship details saved."); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not save internship details.")); }
    finally { setBusy(false); }
  }
  async function onAddTask(event: FormEvent) { event.preventDefault(); setBusy(true); try { await addTask(task); setTask({ date: "", activity: "", lessonLearned: "", skills: "", challenges: "" }); toast.success("Log book task added."); } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not add task.")); } finally { setBusy(false); } }
  async function onAddContact(event: FormEvent) { event.preventDefault(); if (!data?.placement) { toast.error("Save your placement details before adding an agency contact."); return; } setBusy(true); try { await addContact(contact); setContact({ name: "", title: "", phone: "", email: "" }); toast.success("Agency contact added."); } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not add contact.")); } finally { setBusy(false); } }

  return <div className={shell}><PageHeading eyebrow="Internship" title="Internship Process" note="Maintain your placement details and record your weekly log book activities." />
    <div className="flex w-fit rounded-lg border bg-white p-1 shadow-sm">{(["letter", "logbook"] as const).map((value) => <Button key={value} variant="ghost" onClick={() => setTab(value)} className={tab === value ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-slate-600"}>{value === "letter" ? "Acceptance Letter" : "Log Book"}</Button>)}</div>
    {!data ? <Loading /> : tab === "letter" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><Card><CardHeader><CardTitle className="text-base">Placement Details</CardTitle><CardDescription>Complete your organization and supervisor information.</CardDescription></CardHeader><CardContent><form onSubmit={onSavePlacement} className="grid gap-4 sm:grid-cols-2">{Object.entries(placement).map(([key, value]) => <label key={key}><span className={labelClass}>{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).toUpperCase()}</span><input required type={key.toLowerCase().includes("date") ? "date" : key.toLowerCase().includes("email") ? "email" : "text"} value={value} onChange={(event) => setPlacement((old) => ({ ...old, [key]: event.target.value }))} className={inputClass} /></label>)}<label className="sm:col-span-2"><span className={labelClass}>Acceptance Letter</span><input type="file" accept="application/pdf,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${inputClass} py-2`} /></label><div className="flex items-center gap-3 sm:col-span-2"><Button disabled={busy}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Save Details</Button>{data.placement?.acceptanceLetterUrl && <a className="inline-flex items-center gap-1 text-sm text-blue-700 underline" href={data.placement.acceptanceLetterUrl} target="_blank" rel="noreferrer"><FileText className="size-4" />View uploaded letter</a>}</div></form></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Agency Supervisor Contacts</CardTitle></CardHeader><CardContent className="space-y-3">{data.contacts.length === 0 ? <Empty message="No agency supervisor contacts added." /> : data.contacts.map((person) => <div key={person._id} className="flex items-start justify-between gap-2 rounded-md border p-3"><div className="text-sm"><p className="font-medium">{person.name}{person.title ? ` · ${person.title}` : ""}</p><p className="text-xs text-slate-500">{person.phone} · {person.email}</p></div><Button variant="ghost" size="icon" aria-label="Remove contact" onClick={async () => { try { await removeContact({ contactId: person._id }); } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not remove contact.")); } }}><Trash2 className="size-4 text-rose-600" /></Button></div>)}<form onSubmit={onAddContact} className="space-y-3 border-t pt-4"><input required placeholder="Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inputClass} /><input placeholder="Position / Title" value={contact.title} onChange={(e) => setContact({ ...contact, title: e.target.value })} className={inputClass} /><input required placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputClass} /><input required type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputClass} /><Button variant="outline" disabled={busy || !data.placement}><Plus className="mr-2 size-4" />Add Agency Contact</Button>{!data.placement && <p className="text-xs text-amber-700">Save placement details above before adding an agency contact.</p>}</form></CardContent></Card>
    </div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"><Card><CardHeader><CardTitle className="text-base">Add Log Book Task</CardTitle><CardDescription>Record the activity, learning, and skills for a date.</CardDescription></CardHeader><CardContent><form onSubmit={onAddTask} className="space-y-4"><label className="block"><span className={labelClass}>Date</span><input required type="date" value={task.date} onChange={(e) => setTask({ ...task, date: e.target.value })} className={inputClass} /></label>{(["activity", "lessonLearned", "skills", "challenges"] as const).map((field) => <label className="block" key={field}><span className={labelClass}>{field === "lessonLearned" ? "Lesson Learned" : field}</span><textarea required={field !== "challenges"} rows={3} value={task[field]} onChange={(e) => setTask({ ...task, [field]: e.target.value })} className="w-full rounded-md border p-3 text-sm" /></label>)}<Button disabled={busy || !data.placement}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Add Task</Button>{!data.placement && <p className="text-xs text-amber-700">Save acceptance letter placement details before adding log book entries.</p>}</form></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Log Book Entries</CardTitle></CardHeader><CardContent className="space-y-3">{data.tasks.length === 0 ? <Empty message="No log book tasks have been added." /> : data.tasks.map((entry) => <div key={entry._id} className="rounded-lg border p-4"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">{entry.date}</p><StatusBadge status={entry.status} /></div><p className="text-sm font-medium">{entry.activity}</p><p className="mt-1 text-xs text-slate-500">Lesson: {entry.lessonLearned}</p><p className="text-xs text-slate-500">Skills: {entry.skills}</p>{entry.challenges && <p className="mt-1 text-xs text-slate-500">Challenges: {entry.challenges}</p>}</div>)}</CardContent></Card></div>}
  </div>;
}

export function ElectionsView() {
  const data = useQuery(api.student_services.getMyElectionOptions, {});
  const submit = useMutation(api.student_services.submitElectionApplication);
  const [position, setPosition] = useState<Record<string, string>>({});
  const [statement, setStatement] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function apply(event: FormEvent, electionId: Id<"studentElections">) { event.preventDefault(); setBusy(electionId); try { await submit({ electionId, position: position[electionId] ?? "", statement: statement[electionId] ?? "" }); toast.success("Election application submitted."); } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not apply.")); } finally { setBusy(null); } }
  return <div className={shell}><PageHeading eyebrow="Elections" title="Applications" note="Review current student election opportunities and your application status." />
    {!data ? <Loading /> : data.elections.length === 0 ? <Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 size-9 text-slate-400" /><p className="font-medium">No active election applications</p><p className="mt-1 text-sm text-slate-500">Applications will be listed here when the Electoral Committee opens an election.</p></CardContent></Card> : <div className="space-y-4">{data.elections.map((election) => { const application = data.applications.find((item) => item.electionId === election._id); return <Card key={election._id}><CardHeader><CardTitle className="text-base">{election.title}</CardTitle><CardDescription>{election.description || "Student election application"}</CardDescription></CardHeader><CardContent>{application ? <StatusBadge status={application.status} /> : <form onSubmit={(event) => apply(event, election._id)} className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Position</span><input required value={position[election._id] ?? ""} onChange={(event) => setPosition((old) => ({ ...old, [election._id]: event.target.value }))} className={inputClass} /></label><label className="md:col-span-2"><span className={labelClass}>Application Statement</span><textarea required minLength={20} rows={4} value={statement[election._id] ?? ""} onChange={(event) => setStatement((old) => ({ ...old, [election._id]: event.target.value }))} className="w-full rounded-md border p-3 text-sm" /></label><div><Button disabled={busy === election._id}>{busy === election._id && <Loader2 className="mr-2 size-4 animate-spin" />}Submit Application</Button></div></form>}</CardContent></Card>; })}</div>}
  </div>;
}

export function ElectoralCommitteeView() {
  const members = useQuery(api.student_services.getElectoralCommittee, {});
  return <div className={shell}><PageHeading eyebrow="Elections" title="Electoral Committee" note="Contact the committee responsible for student elections." />
    {!members ? <Loading /> : members.length === 0 ? <Card><CardContent className="py-12 text-center"><BookOpen className="mx-auto mb-3 size-9 text-slate-400" /><p className="font-medium">Committee contacts are not available</p><p className="mt-1 text-sm text-slate-500">The university has not published electoral committee contacts yet.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{members.map((member) => <Card key={member._id}><CardHeader><CardTitle className="text-base">{member.name}</CardTitle><CardDescription>{member.role}</CardDescription></CardHeader><CardContent className="space-y-1 text-sm text-slate-600">{member.email && <p>Email: <a className="text-blue-700 underline" href={`mailto:${member.email}`}>{member.email}</a></p>}{member.phone && <p>Phone: {member.phone}</p>}</CardContent></Card>)}</div>}
  </div>;
}

function Loading() { return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-5 animate-spin" />Loading student information…</div>; }
function Empty({ message }: { message: string }) { return <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{message}</div>; }
