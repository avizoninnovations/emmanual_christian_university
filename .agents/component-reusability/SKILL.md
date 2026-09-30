---
name: component-reusability
description: >-
  Standardizes component reusability guidelines across the ECU monorepo.
  Mandatory usage of shadcn primitives (Button, Input, Textarea, Select,
  AlertDialog, Dialog, Table, Card, Tabs, Sidebar, Form, Badge) sourced
  from `@workspace/ui/components/*`. ECU Maroon brand colour applied via
  Tailwind theme tokens — no hardcoded hex.
---

# Component Reusability Standards — Emmanuel Christian University

To ensure a consistent, accessible, on-brand experience across the
**ECU** monorepo (Admin, Student, Finance, LMS, Library, Inventory
portals), all UI work MUST use the shared shadcn primitives from
`@workspace/ui/components/*` instead of building ad-hoc HTML elements.

---

## 1. Button (`@workspace/ui/components/button`)

### Prohibition
❌ **NEVER** write raw HTML `<button className="...">` or custom
unstyled button tags in dashboards, dialogs, forms, or tables.

### Standard Usage
```tsx
import { Button } from "@workspace/ui/components/button";
import { Plus, Trash2, Check } from "lucide-react";

<Button
  variant="default"
  size="default"
  isLoading={isSubmitting}
  onClick={handleSave}
>
  Save Changes
</Button>

<Button variant="destructive" size="sm" icon={<Trash2 className="w-4 h-4" />}>
  Void Receipt
</Button>

<Button variant="outline" onClick={handleEdit}>Edit Record</Button>
<Button variant="ghost">Cancel</Button>
```

### Available Variants & Sizes
- **Variants**: `default` | `destructive` | `outline` | `secondary` |
  `ghost` | `link`
- **Sizes**: `default` | `sm` | `lg` | `icon`

---

## 2. Select (`@workspace/ui/components/select`)

### Prohibition
❌ **NEVER** use raw `<select>` tags or custom popovers for form
dropdowns and filters.

### Standard Usage
```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import { Building2 } from "lucide-react";

<Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Choose faculty..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="theology">Faculty of Theology</SelectItem>
    <SelectItem value="education">Faculty of Education</SelectItem>
    <SelectItem value="business">Faculty of Business</SelectItem>
  </SelectContent>
</Select>
```

Use this everywhere we currently pick: Faculty, Department, Program,
Course, Semester, Sponsor, Channel, Status.

---

## 3. Input (`@workspace/ui/components/input`)

### Prohibition
❌ **NEVER** write raw unstyled HTML `<input>` fields (text, number,
date, time, email, search). Allowed exceptions: `<input type="file"
className="hidden">`, `<input type="color">`, and styled checkbox
toggles.

### Standard Usage
```tsx
import { Input } from "@workspace/ui/components/input";
import { Search } from "lucide-react";

<Input
  placeholder="Search by name or registration number..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>

<Input type="number" placeholder="Amount in SSP" min={0} />
```

For icon-prefixed inputs use `Input` with `className="pl-10"` and an
absolutely-positioned lucide icon.

---

## 4. Textarea (`@workspace/ui/components/textarea`)

### Prohibition
❌ **NEVER** use raw HTML `<textarea>` for comments, descriptions,
notes, feedback, or interview observations.

### Standard Usage
```tsx
import { Textarea } from "@workspace/ui/components/textarea";

<Textarea
  rows={4}
  placeholder="Enter interview notes..."
  value={interviewNotes}
  onChange={(e) => setInterviewNotes(e.target.value)}
/>
```

---

## 5. AlertDialog (`@workspace/ui/components/alert-dialog`) for Confirmations

### Prohibition
❌ **NEVER** use `window.confirm()` or raw custom modal wrappers for
destructive or critical actions (deletes, bans, void receipts, force
logout, semester advance).

### Standard Usage
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Void Receipt?</AlertDialogTitle>
      <AlertDialogDescription>
        This will reverse the transaction and adjust the student ledger.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmVoid}>Yes, void receipt</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 6. Dialog (`@workspace/ui/components/dialog`) for Modal Forms

Use `Dialog` (not `AlertDialog`) for forms that need input — Record
Payment, Edit Fee Structure, Assign Sponsor, Promote Semester, etc.

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
```

---

## 7. Table (`@workspace/ui/components/table`)

### Prohibition
❌ **NEVER** use raw HTML `<table>` markup with ad-hoc CSS for data
listings.

### Standard Usage
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

<Table>
  <TableHeader className="bg-muted/40">
    <TableRow>
      <TableHead>Reg No.</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>Program</TableHead>
      <TableHead className="text-right">Balance (SSP)</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {students.map((s) => (
      <TableRow key={s._id} className="hover:bg-muted/50">
        <TableCell className="font-mono">{s.registrationNumber}</TableCell>
        <TableCell>{s.name}</TableCell>
        <TableCell>{s.programName}</TableCell>
        <TableCell className="text-right tabular-nums">{s.balance.toLocaleString()}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

Pair with `InfiniteScrollTrigger` from
`@workspace/ui/components/infinite-scroll-trigger` for paginated tables.

---

## 8. Card, Tabs, Badge, Sidebar

- **Card** (`@workspace/ui/components/card`) — wrap every section /
  module view.
- **Tabs** (`@workspace/ui/components/tabs`) — for the multi-tab views
  in Finance (Overview, Ledgers, Reconciliation, Sponsors, Structures,
  Transactions) and Marks (Pending, Approved, Returned).
- **Badge** (`@workspace/ui/components/badge`) — for status pills
  (Cleared / Partial / Pending, Approved / Submitted / Returned).
- **Sidebar** (`@workspace/ui/components/sidebar`) — admin / lecturer
  navigation; do not build a custom sidebar.

---

## 9. ECU Brand Theming

### Single-Tenant Architecture
ECU is **single-tenant** — there is one university, one brand, one
colour. There is no `SchoolThemeProvider` and no per-school colour
override.

### Rules
- ❌ **NEVER** hardcode static hex values (e.g. `#800000`, `#1E88E5`).
- ❌ **NEVER** introduce a per-school theme provider or dynamic colour
  prop.
- ✅ **ALWAYS** use Tailwind theme utility classes mapped to CSS
  variables defined in `globals.css`:
  - `bg-primary`, `text-primary`, `border-primary` (ECU Maroon)
  - `bg-secondary`, `text-secondary`, `border-secondary`
  - `bg-accent`, `text-accent-foreground`
  - `bg-background`, `text-foreground`, `border-border`
  - `bg-muted`, `text-muted-foreground`

### Typography
- SANS (UI body): Inter
- SERIF (academic headings, marksheets, transcripts): Source Serif 4
- MONO (registration numbers, audit detail lines): JetBrains Mono

Apply via Tailwind classes: `font-sans`, `font-serif`, `font-mono`.

---

## 10. Iconography

- Use **only** `lucide-react` icons. No other icon library.
- Match weight: keep icon size to `size-4` (16px) for buttons,
  `size-5` (20px) for KPI cards, `size-6` (24px) for sidebar items.
- For status icons (Cleared / Partial / Pending), prefer Badge with a
  semantic colour token, not a coloured icon.