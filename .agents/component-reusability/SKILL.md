---
name: component-reusability
description: >-
  Standardizes component reusability guidelines across School Manager Uganda. Mandatory usage of SoftButton, Button (shadcn), SoftSelect, ConfirmDialog, SoftInput, SoftTextArea, MasterDataTable, and SchoolThemeProvider dynamic tokens.
---

# Component Reusability Standards

To ensure consistent user experience, accessibility, dynamic school branding, and maintainability, all UI components across **School Manager Uganda** MUST use our core reusable UI primitives instead of building ad-hoc HTML elements.

---

## 1. Button Primitives: SoftButton (`@/components/ui/SoftButton`) & Button (`@/components/ui/button`)

### Prohibition
❌ **NEVER** write raw HTML `<button className="...">` or custom unstyled button tags in portal dashboards, dialogs, forms, or tables.

### Standard Usage
You may use either **`<SoftButton>`** or **`<Button>`** (shadcn primitive):

```tsx
import { SoftButton } from '@/components/ui/SoftButton';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Check } from 'lucide-react';

// Using SoftButton
<SoftButton
  variant="primary"
  size="md"
  icon={<Plus className="w-4 h-4" />}
  onClick={handleCreate}
>
  Add Student
</SoftButton>

// Using shadcn Button
<Button
  variant="default"
  size="default"
  isLoading={isSubmitting}
  onClick={handleSave}
>
  Save Changes
</Button>

// SoftButton Soft / Danger Variants
<SoftButton variant="soft" size="sm" onClick={handleEdit}>
  Edit Record
</SoftButton>

<SoftButton
  variant="danger"
  size="sm"
  icon={<Trash2 className="w-4 h-4" />}
  isLoading={isDeleting}
  onClick={handleDelete}
>
  Delete
</SoftButton>
```

### Available Variants & Sizes
- **SoftButton**: `primary` | `secondary` | `soft` | `outline` | `danger` | `warning` | `ghost` (`sm` | `md` | `lg`)
- **Button (shadcn)**: `default` | `destructive` | `outline` | `secondary` | `ghost` | `link` | `success` | `warning` | `soft` (`default` | `sm` | `lg` | `icon` | `xs`)

---

## 2. SoftSelect (`@/components/ui/SoftSelect`)

### Prohibition
❌ **NEVER** use standard HTML `<select>` tags or custom popovers for form dropdowns and filters.

### Standard Usage
```tsx
import { SoftSelect, SelectOption } from '@/components/ui/SoftSelect';
import { Building2 } from 'lucide-react';

const CLASS_OPTIONS: SelectOption[] = [
  { value: 'p1', label: 'Primary 1' },
  { value: 'p2', label: 'Primary 2' },
  { value: 'p3', label: 'Primary 3' },
];

<SoftSelect
  label="Select Class"
  options={CLASS_OPTIONS}
  value={selectedClass}
  onChange={(val) => setSelectedClass(val)}
  placeholder="Choose a class..."
  icon={<Building2 size={16} />}
  searchable
  error={errors.classId?.message}
/>
```

---

## 3. SoftInput (`@/components/ui/SoftInput`)

### Prohibition
❌ **NEVER** write raw unstyled HTML `<input>` fields (text, number, date, time, email, search) in forms, drawers, or dialogs. (Allowed exceptions: standard `<input type="file" className="hidden">`, `<input type="color">`, and styled checkbox toggles).

### Standard Usage
```tsx
import { SoftInput } from '@/components/ui/SoftInput';
import { Search, Mail } from 'lucide-react';

<SoftInput
  label="Search Query"
  placeholder="Search by student name or LIN..."
  icon={<Search size={16} />}
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  error={errors.query?.message}
/>
```

---

## 4. SoftTextArea (`@/components/ui/SoftTextArea`)

### Prohibition
❌ **NEVER** use standard HTML `<textarea>` tags for comments, descriptions, notes, or feedback inputs.

### Standard Usage
```tsx
import { SoftTextArea } from '@/components/ui/SoftTextArea';
import { MessageSquareText } from 'lucide-react';

<SoftTextArea
  label="Teacher Remarks"
  labelDescription="(Optional)"
  placeholder="Enter general observation or support strategies..."
  icon={<MessageSquareText size={16} />}
  rows={4}
  value={remarks}
  onChange={(e) => setRemarks(e.target.value)}
  error={errors.remarks?.message}
/>
```

---

## 5. ConfirmDialog (`@/components/ui/ConfirmDialog`)

### Prohibition
❌ **NEVER** use browser `window.confirm()` or raw custom modal wrappers for destructive or critical actions.

### Standard Usage
```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

<ConfirmDialog
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  onConfirm={handleDeleteConfirmed}
  title="Delete Student Record"
  message="Are you sure you want to delete this student? This action cannot be undone."
  confirmText="Yes, Delete"
  variant="danger"
  isLoading={isDeleting}
/>
```

---

## 6. Dynamic Multi-Tenant Theming Tokens

### Multi-Tenant Architecture
Every school has dynamic brand colors (primary, secondary, accent) loaded via `SchoolThemeProvider`.

### Rules
- ❌ **NEVER** hardcode static hex values (e.g., `#2e3192`, `#1E88E5`, `#f97316`).
- ✅ **ALWAYS** use Tailwind theme utility classes:
  - `bg-primary`, `text-primary`, `border-primary`
  - `bg-secondary`, `text-secondary`, `border-secondary`
  - `bg-accent`, `text-accent-foreground`
  - `bg-background`, `text-foreground`, `border-border`
  - `bg-muted`, `text-muted-foreground`
