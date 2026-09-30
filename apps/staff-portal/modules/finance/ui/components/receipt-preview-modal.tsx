"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Printer, CheckCircle2, Building2, Calendar, User, ShieldCheck } from "lucide-react";
import Image from "next/image";

export interface ReceiptData {
  receiptNumber: string;
  date: number;
  studentName: string;
  studentRegNumber: string;
  programName: string;
  amount: number;
  currency?: string;
  method: string;
  channel?: string;
  bankBranch?: string;
  slipNumber?: string;
  depositDate?: string;
  reference: string;
  notes?: string;
  balance?: number;
  recordedBy?: string;
}

interface ReceiptPreviewModalProps {
  receipt: ReceiptData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReceiptPreviewModal = ({
  receipt,
  open,
  onOpenChange,
}: ReceiptPreviewModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = receipt.currency || "SSP";
  const formattedDate = new Date(receipt.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = new Date(receipt.date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getChannelLabel = (ch?: string, m?: string) => {
    if (ch === "equity_bank") return "Equity Bank South Sudan";
    if (ch === "kcb_bank") return "KCB Bank South Sudan";
    if (ch === "stanbic_bank") return "Stanbic Bank South Sudan";
    if (ch === "m_gurush") return "m-GURUSH Mobile Money";
    if (ch === "bank_deposit") return "Bank Deposit Slip";
    if (ch === "cash" || m === "cash") return "Cash Office (Campus Bursar)";
    return (ch || m || "Cash").replace("_", " ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden print:border-none print:shadow-none">
        <DialogHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <DialogTitle className="text-base font-semibold">Payment Receipt</DialogTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
            {receipt.receiptNumber}
          </Badge>
        </DialogHeader>

        {/* ── Printable Content Area ── */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 text-foreground bg-background relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="text-8xl font-black rotate-[-30deg] tracking-widest text-foreground">ECU PAID</span>
          </div>

          {/* Header & Logo */}
          <div className="flex items-center justify-between border-b pb-5">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-md border flex items-center justify-center p-1 bg-white">
                <Image
                  src="/icon.png"
                  alt="ECU Logo"
                  width={48}
                  height={48}
                  className="size-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight tracking-tight">
                  Emmanuel Christian University
                </h2>
                <p className="text-xs text-muted-foreground">Office of the Bursar & Finance Department</p>
                <p className="text-[11px] text-muted-foreground">Goli, Yei River County · South Sudan</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block border border-primary/30 bg-primary/5 px-2.5 py-1 rounded text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                  Official Receipt
                </span>
                <span className="font-mono font-bold text-xs">{receipt.receiptNumber}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formattedDate} · {formattedTime}
              </p>
            </div>
          </div>

          {/* Student & Academic Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-3.5 rounded-lg border">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Student Name</span>
              <span className="font-semibold text-sm text-foreground">{receipt.studentName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Registration No.</span>
              <span className="font-mono font-semibold text-sm text-foreground">{receipt.studentRegNumber}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Academic Program</span>
              <span className="font-medium text-foreground">{receipt.programName}</span>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Breakdown
            </h4>
            <div className="border rounded-lg overflow-hidden text-sm">
              <div className="flex justify-between p-3 bg-muted/10 border-b">
                <span>Tuition & Semester Fees</span>
                <span className="font-mono font-medium">
                  {currency} {receipt.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-primary/5 font-bold text-base border-b">
                <span className="text-primary">Total Amount Paid</span>
                <span className="font-mono text-primary">
                  {currency} {receipt.amount.toLocaleString()}
                </span>
              </div>
              {receipt.balance !== undefined && (
                <div className="flex justify-between p-3 bg-muted/20 text-xs">
                  <span className="text-muted-foreground">Outstanding Semester Balance</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {currency} {receipt.balance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Method & References */}
          <div className="grid grid-cols-2 gap-4 text-xs border-t pt-4">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Payment Channel</span>
              <span className="font-medium capitalize text-foreground">{getChannelLabel(receipt.channel, receipt.method)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Transaction Ref / Slip No.</span>
              <span className="font-mono font-medium text-foreground">{receipt.slipNumber || receipt.reference}</span>
            </div>
            {receipt.bankBranch && (
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Bank Branch</span>
                <span className="font-medium text-foreground">{receipt.bankBranch}</span>
              </div>
            )}
            {receipt.depositDate && (
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Bank Deposit Date</span>
                <span className="font-medium text-foreground">{receipt.depositDate}</span>
              </div>
            )}
            {receipt.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Notes</span>
                <span className="text-muted-foreground">{receipt.notes}</span>
              </div>
            )}
          </div>

          {/* Signature & Security Footer */}
          <div className="flex items-end justify-between border-t pt-6 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <ShieldCheck className="size-4" />
              <span>Verified System Generated Receipt</span>
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-dashed border-muted-foreground/50 mb-1" />
              <span>Authorized Signature / Stamp</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 flex sm:justify-between items-center">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Keep this receipt for semester exam clearance and audit.
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button className="flex-1 sm:flex-none gap-2 bg-primary hover:bg-primary/90" onClick={handlePrint}>
              <Printer className="size-4" /> Print Receipt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
