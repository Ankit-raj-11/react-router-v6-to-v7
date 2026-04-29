# Skill: Creating a jssg Transform Rule

This document is the strict Standard Operating Procedure (SOP) for the **jssg Transforms Engineer**. It instructs the AI on exactly how to implement a single `jssg` (JS ast-grep) rule for the React Router v6 → v7 codemod.

**Project Core Goal**: Zero false positives with >80% automated migration.
**Tooling Constraint**: You MUST use `jssg` (ast-grep). `jscodeshift` is strictly prohibited.

---

## STEP 1: Identify the pattern in v6 code
Locate the exact syntactic pattern in the v6 code that requires migration. Determine the scope of the change.

**Example Pattern**:
```typescript
import { useNavigate, useLocation } from 'react-router-dom';
```

## STEP 2: Write the jssg pattern
Construct the `ast-grep` pattern. The pattern must be exceptionally specific to avoid false positives. Always include surrounding syntactic context securely locking the match.

**Example jssg pattern**: 
```yaml
id: react-router-import-update
language: typescript
rule:
  pattern: import { $$$IMPORTS } from 'react-router-dom'
```

## STEP 3: Write the replacement
Define the v7 output transformation. You must perfectly preserve inner variables (like `$$$IMPORTS`), user custom types, formatting, and comments.

**Example jssg fix**:
```yaml
fix: import { $$$IMPORTS } from 'react-router'
```

## STEP 4: Test the transform
Rules without tests are considered illegitimate. 

1. Create your input condition in: `tests/fixtures/input/[transform-name].ts`
2. Create your exact expected outcome in: `tests/fixtures/expected/[transform-name].ts`
3. Execute the validation:
   ```bash
   npx codemod jssg test
   ```

## STEP 5: Verify TypeScript compilation
The output must be type-safe.

1. Execute a dry-run TS build against the newly transformed output:
   ```bash
   tsc --noEmit tests/fixtures/input/[transform-name].ts
   ```
2. **Failure Fallback**: If the TypeScript compiler uncovers new errors introduced by the transform, you must immediately roll back and refine your pattern (Return to STEP 2) or skip it completely.

## STEP 6: Document the transform
1. Add the newly completed transform to the codemod migration coverage table.
2. Clearly note any dynamic edges cases this specific rule does *not* support.

---

## ⚠️ Common Pitfalls & Safe Fallbacks

- **Over-matching**: Writing a selector that merely searches for the string `'react-router-dom'` without AST boundaries will accidentally replace variables or comments. Use AST patterns strictly.
- **Dynamic or Ambiguous Usage**: If the codebase applies React Router hooks dynamically through `any` types or complex nested higher-order components where the AST structure isn't predictable, **skip it.**

### AI Fallback Comment
If a pattern is skipped due to unpredictability and you cannot guarantee a zero false-positive transformation, inject the following comment immediately preceding the broken code block:

```typescript
// CODEMOD: MANUAL REVIEW - [Detailed reason why transformation was unsafe]
```
Injecting this phrase triggers the secondary AI fallback handler specifically trained for edge cases.

---

## ✅ Transform Quality Checklist

Before considering a transform task "Complete", the system must verify:
- [ ] The transform is written in `jssg` YAML (No regex, no jscodeshift).
- [ ] The pattern selector matches distinct AST nodes rather than raw strings.
- [ ] Variables, generic typing, and formatting have been cleanly preserved in the `fix`.
- [ ] Specific Input and Expected fixtures have been merged to `tests/fixtures/`.
- [ ] A run of validation using `npx codemod jssg test` passes.
- [ ] The transformed output successfully survived `tsc --noEmit`.
- [ ] Any impossible node edge cases correctly resulted in a `// CODEMOD: MANUAL REVIEW` emission.
- [ ] Zero false positives verified (run `git diff` on test repos, no incorrect changes)
