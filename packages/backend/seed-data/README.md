# ECU academic catalog for the demo seed

`ecu-catalog.json` contains the faculty and program names extracted from
[ECU's faculties page](https://ecu-ssd.org/faculties.html). Source spelling and
capitalization are preserved. Each program links to its faculty through
`facultyKey`; the keys are generated locally and are not official ECU codes.

| Faculty | Programs | Bachelor | Diploma | Certificate |
| --- | ---: | ---: | ---: | ---: |
| Theology | 3 | 1 | 1 | 1 |
| Education and Community Development | 6 | 3 | 2 | 1 |
| Business and Leadership Development | 7 | 2 | 2 | 3 |
| Agriculture | 3 | 1 | 1 | 1 |
| Total | 19 | 7 | 6 | 6 |

Refresh the catalog from the repository root with:

```powershell
python scripts/scrape-ecu-catalog.py
```

The scraper only fetches public pages and writes this local JSON snapshot.
It records the pages checked, fetch failures, document links, and curriculum
links. It makes no database or authentication changes.

## Mapping into the existing schema

- Website faculties map to `faculties`.
- The degree, diploma, and certificate offerings map to `programs`.
- Individual taught units would map to `courses`.
- `programs.departmentId` and `courses.departmentId` require department records,
  but the faculty page does not publish a department hierarchy.
- Faculty/program codes and `programs.durationYears` are required in the database,
  but the faculty page does not provide them.
- Unit codes, titles, credit units, years of study, and semester allocations
  are not published on the faculty page. The checked admissions, application,
  and home pages did not expose curriculum document links.

Unknown values are `null` or empty arrays, with explicit source-status fields.
An empty `courseUnits` array means the curriculum was unavailable in this
extraction; it does not mean the program has no course units. This snapshot is
staging data and cannot be imported directly as schema-complete database rows.

## Approved synthetic test fixture

`ecu-demo-seed.json` is the schema-shaped fixture prepared for later Convex
seeding. It keeps the 4 scraped faculties and 19 published program names, and
adds clearly marked demo departments, program codes, durations, and 76
illustrative course units so the current `departments`, `programs`, and
`courses` schema can represent the catalog. These added curriculum values are
test examples, not official ECU curriculum.

The fixture also contains two academic periods, six staff accounts, eight
student accounts across the four faculties, 76 lecturer/course allocations,
student registrations, approved sample marks and retakes, lecture and exam
schedules, ledger/payment data, and records for the student portal
services. References use stable faculty keys, department keys, program codes,
course codes, emails, and student registration numbers for the future seed
importer to resolve into Convex document IDs.

All demo accounts use `UniSystem2026!`; the fixture lists their emails and
roles under `testAccounts`. These are fictional local testing credentials.
The fixture itself has not been written to a Convex database.

## Updated seed proposal awaiting approval

Use all four published faculties and all 19 published programs as the academic
catalog. Expand the earlier staff/student demo proposal to include teaching and
student examples in every faculty. All course allocations, registrations,
marks, timetables, and fee records must reference the same linked
catalog records and academic periods.

For official course units, the next required source is a curriculum or course
outline containing unit titles, codes, credits, and semester allocations.
The approved demo fixture uses explicitly labeled synthetic course units,
department mappings, internal codes, and durations. Those values remain
identified as demo assumptions rather than scraped ECU facts.

The existing seed includes a Science & Technology faculty, Computer Science,
and a Diploma in IT, which are not listed on this particular faculties page.
They should be reviewed during reconciliation; absence from this page alone
does not justify deleting or reassigning existing database records.

This approval covers local data files only. No database population has been
performed; a Convex seed importer and its execution remain a later step.
