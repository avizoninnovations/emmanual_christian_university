"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Award,
  Building2,
  Users,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  Mail,
  Phone,
  UserCheck,
  Percent,
  Trash2,
  MoreHorizontal,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@workspace/ui/components/table";

export const SponsorsManagerView = () => {
  const [activeTab, setActiveTab] = useState<string>("directory");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<"church" | "ngo" | "government" | "private">("church");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [coveragePercentage, setCoveragePercentage] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Student State
  const [assignStudentId, setAssignStudentId] = useState<string>("");
  const [assignSponsorId, setAssignSponsorId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");

  // Queries & Mutations
  const sponsors = useQuery(api.finance.getSponsors, {});
  const sponsoredStudents = useQuery(api.finance.getSponsoredStudents, {});
  const allLedgers = useQuery(api.finance.getStudentLedgers, {});
  const createSponsor = useMutation(api.finance.createSponsor);
  const deleteSponsor = useMutation(api.finance.deleteSponsor);
  const assignStudentSponsor = useMutation(api.finance.assignStudentSponsor);

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Please enter sponsor name and code.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSponsor({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        contactPerson: contactPerson.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        coveragePercentage: parseInt(coveragePercentage, 10) || 100,
      });

      toast.success(`Sponsor '${name}' registered successfully!`);
      setName("");
      setCode("");
      setContactPerson("");
      setContactEmail("");
      setContactPhone("");
      setCoveragePercentage("100");
      setIsCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create sponsor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId) {
      toast.error("Please select a student.");
      return;
    }

    setIsSubmitting(true);
    try {
      await assignStudentSponsor({
        studentId: assignStudentId as Id<"students">,
        sponsorId: assignSponsorId ? (assignSponsorId as Id<"sponsors">) : undefined,
      });

      toast.success("Student sponsorship assigned successfully!");
      setAssignStudentId("");
      setAssignSponsorId("");
      setIsAssignOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSponsor = async (id: Id<"sponsors">, spName: string) => {
    if (!confirm(`Are you sure you want to remove '${spName}'? All linked students will be unassigned.`)) return;
    try {
      await deleteSponsor({ id });
      toast.success("Sponsor removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove sponsor.");
    }
  };

  // Metrics
  const totalSponsors = sponsors?.length || 0;
  const totalSponsoredStudents = sponsoredStudents?.length || 0;
  let totalBilled = 0;
  let totalPaid = 0;
  (sponsoredStudents || []).forEach((st) => {
    totalBilled += st.totalDue;
    totalPaid += st.totalPaid;
  });
  const totalBalance = Math.max(0, totalBilled - totalPaid);

  const filteredSponsors = (sponsors || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  const filteredStudents = (sponsoredStudents || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.registrationNumber.toLowerCase().includes(q) ||
      s.sponsorName.toLowerCase().includes(q)
    );
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "church":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 text-[10px]">Church / Diocese</Badge>;
      case "ngo":
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-200 text-[10px]">Humanitarian / NGO</Badge>;
      case "government":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[10px]">Government / MoHEST</Badge>;
      default:
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-200 text-[10px]">Private / Partner</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Award className="size-4 text-amber-600" />
            Institutional Sponsors & Bursaries
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage church dioceses, UNHCR, NGOs, and external scholarships supporting students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAssignOpen(true)} variant="outline" className="gap-1.5 h-9 text-xs">
            <UserCheck className="size-3.5" /> Assign Student
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90">
            <Plus className="size-3.5" /> Add Sponsor
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-amber-600">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Registered Sponsors</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-foreground">{totalSponsors}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Church dioceses, NGOs & partners</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-sky-600">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Sponsored Students</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-sky-600">{totalSponsoredStudents}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active scholarship beneficiaries</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-600">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Fees Invoiced</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-emerald-600">SSP {totalBilled.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Paid: SSP {totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-rose-600">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Outstanding Receivable</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-rose-600">SSP {totalBalance.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Pending sponsor disbursement</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs Content ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="directory" className="text-xs gap-1.5">
              <Building2 className="size-3.5" /> Sponsors Directory ({filteredSponsors.length})
            </TabsTrigger>
            <TabsTrigger value="roster" className="text-xs gap-1.5">
              <Users className="size-3.5" /> Beneficiary Students ({filteredStudents.length})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search sponsor or student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* ── TAB 1: SPONSORS DIRECTORY ── */}
        <TabsContent value="directory" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSponsors.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-muted/20 rounded-xl border text-xs text-muted-foreground">
                No institutional sponsors registered yet. Click "Add Sponsor" to register one.
              </div>
            ) : (
              filteredSponsors.map((sp) => (
                <Card key={sp._id} className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 mb-1">
                          {sp.code}
                        </Badge>
                        <h4 className="font-bold text-sm text-foreground">{sp.name}</h4>
                      </div>
                      {getCategoryBadge(sp.category)}
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-2.5">
                      <div className="flex items-center justify-between">
                        <span>Coverage:</span>
                        <span className="font-semibold text-foreground">{sp.coveragePercentage}% Tuition</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Students Sponsored:</span>
                        <span className="font-mono font-semibold text-sky-600">{sp.studentCount} students</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Balance Due:</span>
                        <span className="font-mono font-semibold text-rose-600">SSP {sp.totalBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    {(sp.contactPerson !== "—" || sp.contactPhone !== "—") && (
                      <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded border space-y-0.5">
                        <div className="font-medium text-foreground">{sp.contactPerson}</div>
                        {sp.contactPhone !== "—" && <div className="font-mono">{sp.contactPhone}</div>}
                        {sp.contactEmail !== "—" && <div>{sp.contactEmail}</div>}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteSponsor(sp._id, sp.name)}
                      >
                        <Trash2 className="size-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── TAB 2: BENEFICIARY STUDENTS ROSTER ── */}
        <TabsContent value="roster" className="m-0">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="pl-4">Student</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Sponsor Entity</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Billed (SSP)</TableHead>
                    <TableHead>Paid (SSP)</TableHead>
                    <TableHead className="text-right pr-4">Balance (SSP)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                        No sponsored students found. Assign students using the "Assign Student" button.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((st) => (
                      <TableRow key={st.studentId} className="text-xs">
                        <TableCell className="pl-4">
                          <div className="font-medium text-foreground">{st.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{st.registrationNumber}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{st.programName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold text-[11px] bg-primary/5 text-primary border-primary/20">
                            {st.sponsorName}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium">{st.coveragePercentage}%</TableCell>
                        <TableCell className="font-mono">{st.totalDue.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-emerald-600">{st.totalPaid.toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-4 font-mono font-bold text-rose-600">
                          {st.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Create Sponsor ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Register Institutional Sponsor
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a church diocese, humanitarian agency, or government scholarship sponsor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSponsor} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="spName">Sponsor / Organization Name *</Label>
              <Input
                id="spName"
                placeholder="e.g. Diocese of Yei, UNHCR South Sudan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="spCode">Short Code *</Label>
                <Input
                  id="spCode"
                  placeholder="e.g. DOY, UNHCR"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="church">Church / Diocese</SelectItem>
                    <SelectItem value="ngo">Humanitarian / NGO</SelectItem>
                    <SelectItem value="government">Government / MoHEST</SelectItem>
                    <SelectItem value="private">Private / Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="coverage">Tuition Coverage Percentage (%)</Label>
              <Input
                id="coverage"
                type="number"
                min="1"
                max="100"
                value={coveragePercentage}
                onChange={(e) => setCoveragePercentage(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="contactPerson">Contact Person (Optional)</Label>
              <Input
                id="contactPerson"
                placeholder="e.g. Rev. Peter Lado, Education Secretary"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="+211 9..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@org.org"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Registering..." : "Register Sponsor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Assign Student to Sponsor ── */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="size-4 text-primary" /> Assign Student Sponsorship
            </DialogTitle>
            <DialogDescription className="text-xs">
              Link an enrolled student to an institutional scholarship sponsor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignStudent} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Student</Label>
              <Select value={assignStudentId} onValueChange={setAssignStudentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {(allLedgers || []).map((l) => (
                    <SelectItem key={l.studentId} value={l.studentId}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">{l.studentName}</span>
                        <span className="text-muted-foreground font-mono">({l.studentRegNumber})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Select Sponsor</Label>
              <Select value={assignSponsorId} onValueChange={setAssignSponsorId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose sponsor or 'None' to unlink..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- None (Self-Sponsored) --</SelectItem>
                  {(sponsors || []).map((sp) => (
                    <SelectItem key={sp._id} value={sp._id}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">{sp.name}</span>
                        <span className="text-muted-foreground font-mono">({sp.code})</span>
                        <span className="text-primary font-medium">{sp.coveragePercentage}%</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Saving..." : "Save Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
