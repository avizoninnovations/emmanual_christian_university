<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

## Backend errors (required for every existing and new Convex function)

- Throw `ConvexError` with safe, human-readable copy for expected validation, authorization, missing/duplicate record, and business-rule failures. Use a string for simple messages or `{ message, code, tip? }` for structured feedback.
- Do not use plain `Error` for expected domain rejections. Do not catch and suppress restrictions, weaken authorization, or turn failed operations into success.
- Leave unexpected programming, infrastructure, and external-service failures diagnosable. Never send stack traces, Convex request IDs, or internal implementation details to users.
- Client applications display backend failures through `getUserFacingErrorMessage` from `@workspace/ui`; do not add feature-specific parsing.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
