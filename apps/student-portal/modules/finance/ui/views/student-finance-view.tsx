"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table";

const currency = (amount: number) => `SSP ${Math.abs(amount).toLocaleString()}`;
const dateLabel = (date: number) => new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
}).format(date).toUpperCase();

export function StudentFinanceView() {
  const statement = useQuery(api.student_portal.getMyFinancialStatement);
  const profile = useQuery(api.student_portal.getMyProfile);

  if (statement === undefined || profile === undefined) {
    return <div className="flex min-h-96 flex-col items-center justify-center gap-3"><Loader2 className="size-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Loading your financial statement…</p></div>;
  }
  if (!statement || !profile) {
    return <p className="p-8 text-sm text-muted-foreground">Your financial statement is not available. Contact the Finance Office.</p>;
  }

  const credit = Math.max(0, statement.summary.totalPaid - statement.summary.totalBilled);
  const amountDue = Math.max(statement.summary.balance, statement.summary.totalBilled - statement.summary.totalPaid, 0);
  const balance = credit > 0 ? -credit : amountDue;
  const period = profile.currentPeriod
    ? `${profile.currentPeriod.name} ${profile.currentPeriod.year}`
    : "No active academic period";

  return (
    <main className="space-y-4 p-5 sm:p-6 lg:p-8 print:p-0">
      <section className="grid gap-4 sm:grid-cols-3 print:hidden" aria-label="Financial summary">
        <SummaryCard label="Balance" value={currency(balance)} note={credit > 0 ? "in credit" : amountDue > 0 ? "outstanding" : "cleared"} />
        <SummaryCard label="Total Amount Paid" value={currency(statement.summary.totalPaid)} note="payments received" />
        <SummaryCard label="Total Amount Billed" value={currency(statement.summary.totalBilled)} note={amountDue === 0 ? "all bills cleared" : "tuition and fees"} />
      </section>

      <section className="student-financial-statement overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm ring-1 ring-foreground/5">
        <div className="flex justify-end px-5 pt-4 sm:px-8 print:hidden">
          <Button onClick={() => window.print()} size="sm" className="gap-2"><Printer className="size-4" />Print Statement</Button>
        </div>

        <header className="grid gap-4 border-b border-border/60 px-5 pb-5 pt-2 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="Emmanuel Christian University logo" width={68} height={68} className="size-16 object-contain" priority />
            <div>
              <h2 className="font-serif text-lg font-semibold uppercase leading-tight text-foreground sm:text-xl">Emmanuel Christian University</h2>
              <p className="mt-1 text-xs font-medium text-primary">A transformed people with academic excellence</p>
            </div>
          </div>
          <StatementHeading
            faculty={profile.faculty.name}
            program={profile.program.name}
            programType={profile.programType || "Program type not provided"}
          />
          <div className="text-xs leading-5 text-muted-foreground lg:text-right">
            <p className="font-semibold text-foreground">Finance &amp; Accounts Office</p>
            <p>Goli, Yei River County, South Sudan</p>
          </div>
        </header>

        <div className="px-5 pb-5 sm:px-8">
          <StudentDetails
            name={profile.name}
            gender={profile.gender}
            accessNumber={profile.accessNumber}
            sponsorship={profile.sponsorName}
            registrationNumber={profile.registrationNumber}
            nationality={profile.nationality}
            yearOfEntry={profile.yearOfEntry}
            period={period}
            imageUrl={profile.imageUrl}
          />

          <TransactionLedger transactions={statement.transactions} />
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <Card className="border-0 shadow-sm ring-1 ring-foreground/5">
    <CardContent className="min-h-20 p-4 sm:p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </CardContent>
  </Card>;
}

function StatementHeading({ faculty, program, programType }: { faculty: string; program: string; programType: string }) {
  const facultyTitle = faculty.toLowerCase().startsWith("faculty of ") ? faculty : `Faculty of ${faculty}`;

  return <div className="text-center">
    <h1 className="text-xl font-bold uppercase tracking-tight text-primary sm:text-2xl">Student&apos;s Financial Statement</h1>
    <p className="mt-2 text-sm font-medium uppercase text-foreground sm:text-base">{facultyTitle}</p>
    <p className="mt-1 text-xs font-semibold uppercase text-foreground">{program} ({programType})</p>
  </div>;
}

function StudentDetails({ name, gender, accessNumber, sponsorship, registrationNumber, nationality, yearOfEntry, period, imageUrl }: {
  name: string; gender: string; accessNumber: string; sponsorship: string;
  registrationNumber: string; nationality: string; yearOfEntry: number | null;
  period: string; imageUrl: string | null;
}) {
  const left: Array<[string, string]> = [
    ["Full name", name], ["Access number", accessNumber || "—"],
    ["Registration number", registrationNumber], ["Year of entry", yearOfEntry ? String(yearOfEntry) : "—"],
  ];
  const right: Array<[string, string]> = [
    ["Gender", gender ? gender.replaceAll("_", " ").toUpperCase() : "—"],
    ["Sponsorship", sponsorship || "Not provided"], ["Nationality", nationality || "—"], ["Period", period],
  ];

  return <section className="mx-auto grid max-w-6xl gap-5 border-b border-border/50 py-4 sm:py-5 lg:grid-cols-2 lg:items-center lg:gap-10" aria-label="Student details">
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
      <div className="relative flex size-[72px] items-center justify-center overflow-hidden rounded-sm bg-muted">
        {imageUrl ? <Image src={imageUrl} alt={`${name} student portrait`} fill unoptimized className="object-cover" /> : <span className="text-3xl font-semibold text-muted-foreground">{name.charAt(0)}</span>}
      </div>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {left.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}
      </dl>
    </div>
    <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
      {right.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}
    </dl>
  </section>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div>
    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 break-words text-xs font-medium text-foreground">{value}</dd>
  </div>;
}

type StatementTransaction = {
  _id: string;
  date: number;
  reference: string;
  description: string;
  type: "payment" | "charge" | "waiver";
  debit: number;
  credit: number;
  balance: number;
  channel: string;
};

function TransactionLedger({ transactions }: { transactions: StatementTransaction[] }) {
  return <div className="overflow-x-auto rounded-lg ring-1 ring-border/60">
    <Table className="min-w-[880px] text-xs">
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-center text-[11px] font-medium uppercase">Date</TableHead>
          <TableHead className="text-center text-[11px] font-medium uppercase">Reference</TableHead>
          <TableHead className="text-center text-[11px] font-medium uppercase">Description</TableHead>
          <TableHead className="text-right text-[11px] font-medium uppercase">Debit</TableHead>
          <TableHead className="text-right text-[11px] font-medium uppercase">Credit</TableHead>
          <TableHead className="text-right text-[11px] font-medium uppercase">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transactions have been recorded.</TableCell></TableRow> :
          transactions.map(transaction => <LedgerRow key={transaction._id} transaction={transaction} />)}
      </TableBody>
    </Table>
  </div>;
}

function LedgerRow({ transaction }: { transaction: StatementTransaction }) {
  const description = transaction.description || transaction.channel.replaceAll("_", " ");
  return <TableRow className="even:bg-muted/40 print:break-inside-avoid">
    <TableCell className="whitespace-nowrap text-center text-muted-foreground">{dateLabel(transaction.date)}</TableCell>
    <TableCell className="whitespace-nowrap text-center font-mono">{transaction.reference || "—"}</TableCell>
    <TableCell className="max-w-[360px] whitespace-normal text-center">
      {transaction.description || `${transaction.type === "charge" ? "Fees billed" : transaction.type === "waiver" ? "Fee waiver" : "Payment received"} · ${description}`}
    </TableCell>
    <TableCell className="whitespace-nowrap text-right font-mono">{transaction.debit > 0 ? currency(transaction.debit) : "—"}</TableCell>
    <TableCell className="whitespace-nowrap text-right font-mono">{transaction.credit > 0 ? currency(transaction.credit) : "—"}</TableCell>
    <TableCell className="whitespace-nowrap text-right font-mono font-medium">{transaction.balance < 0 ? `${currency(transaction.balance)} Cr` : currency(transaction.balance)}</TableCell>
  </TableRow>;
}
