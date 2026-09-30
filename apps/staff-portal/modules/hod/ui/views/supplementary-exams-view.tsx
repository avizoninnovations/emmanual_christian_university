"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Award,
  Loader2,
  Edit,
  Info,
  Calendar,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";

export function SupplementaryExamsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [rawScoreInput, setRawScoreInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const candidates = useQuery(api.marks.getSupplementaryCandidates, {});
  const recordSupplementary = useMutation(api.marks.recordSupplementaryMark);

  const handleOpenRecordDialog = (c: any) => {
    setSelectedCandidate(c);
    setRawScoreInput(c.supplementaryScore ? String(c.supplementaryScore) : "");
  };

  const handleSaveSupplementary = async () => {
    if (!selectedCandidate) return;
    const raw = Number(rawScoreInput);
    if (isNaN(raw) || raw < 0 || raw > 100) {
      toast.error("Please enter a valid raw examination score between 0 and 100.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await recordSupplementary({
        assessmentId: selectedCandidate.assessmentId,
        rawScore: raw,
      });

      toast.success(
        `Recorded supplementary exam: Raw ${raw}% capped to official ${res.finalScore}% (${res.grade})`
      );
      setSelectedCandidate(null);
      setRawScoreInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record supplementary examination");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!candidates) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading supplementary examination candidates...</p>
      </div>
    );
  }

  const filtered = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.studentName.toLowerCase().includes(q) ||
      c.studentRegNumber.toLowerCase().includes(q) ||
      c.courseCode.toLowerCase().includes(q) ||
      c.courseTitle.toLowerCase().includes(q)
    );
  });

  const rawNum = Number(rawScoreInput);
  const simPassed = !isNaN(rawNum) && rawNum >= 50;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Supplementary & Special Examinations
            </h1>
            <Badge variant="outline" className="text-xs uppercase bg-amber-500/10 text-amber-600 border-amber-300">
              Grade D & Special Candidates
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage candidates sitting supplementary examination papers under South Sudan MoHEST Grade C capping guidelines.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search candidate or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* ── MoHEST Statutory Advisory Banner ── */}
      <Card className="border-amber-200 bg-amber-500/5 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              South Sudan Ministry of Higher Education (MoHEST) Supplementary Regulations
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Under South Sudan university grading statutes, candidates who obtain Grade <strong>D</strong> (40%–49%) are entitled to sit supplementary examinations. Regardless of how high a student scores on a supplementary paper, the maximum official awarded score is capped at <strong>50% (Grade C, 2.0 GP)</strong>. The original score is retained for university audit records.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Candidate Table ── */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Eligible Supplementary Candidates
              </CardTitle>
              <CardDescription className="text-xs">
                {filtered.length} candidate(s) listed for supplementary examination assessment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6">Reg Number</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Course Unit</TableHead>
                <TableHead className="text-center">Original Result</TableHead>
                <TableHead className="text-center">Raw Supp Score</TableHead>
                <TableHead className="text-center">Official Capped Grade</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                    {searchQuery ? "No matching candidates found." : "No supplementary candidates found in this period."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.assessmentId} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-mono font-semibold text-xs text-primary">
                      {c.studentRegNumber}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {c.studentName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">{c.courseCode}</span>
                        <span className="text-[11px] text-muted-foreground">{c.courseTitle}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
                        {c.originalScore}% (Grade {c.originalGrade})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {c.supplementaryScore !== undefined ? (
                        <span className="font-bold">{c.supplementaryScore}%</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.isSupplementary ? (
                        <Badge
                          variant="outline"
                          className={
                            c.currentGrade === "C"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs font-bold"
                              : "bg-rose-500/10 text-rose-600 border-rose-200 text-xs font-bold"
                          }
                        >
                          {c.currentScore}% (Grade {c.currentGrade})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Pending Exam
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenRecordDialog(c)}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Edit className="size-3" />
                        {c.isSupplementary ? "Update Mark" : "Record Exam"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Record Supplementary Dialog ── */}
      <Dialog open={!!selectedCandidate} onOpenChange={(o) => !o && setSelectedCandidate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Record Supplementary Examination Mark
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the student&apos;s score out of 100 on the supplementary examination paper.
            </DialogDescription>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-bold">{selectedCandidate.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration No:</span>
                  <span className="font-mono font-semibold">{selectedCandidate.studentRegNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course:</span>
                  <span>{selectedCandidate.courseCode}: {selectedCandidate.courseTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Score:</span>
                  <span className="text-amber-600 font-bold font-mono">
                    {selectedCandidate.originalScore}% (Grade {selectedCandidate.originalGrade})
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold block text-xs">
                  Raw Supplementary Exam Score (0 – 100)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 74"
                  value={rawScoreInput}
                  onChange={(e) => setRawScoreInput(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {/* Simulation Banner */}
              {rawScoreInput !== "" && !isNaN(rawNum) && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    simPassed
                      ? "bg-emerald-500/10 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-500/10 border-rose-200 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <p className="font-bold">
                    Official Recorded Outcome:
                  </p>
                  <p>
                    {simPassed
                      ? "Passed paper! Raw score of " + rawNum + "% will be officially recorded as 50% (Grade C, 2.0 GP) per MoHEST statutory cap."
                      : "Failed paper! Raw score of " + rawNum + "% (< 50%) will be recorded as Grade F (0.0 GP). Student must repeat the course unit."}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCandidate(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSupplementary}
              disabled={isSubmitting || !rawScoreInput}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Save Official Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
