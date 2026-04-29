# React Router v6 → v7 Codemod Conventions

These rules are strictly enforced for all agents. Any deviation risking false positives or hackathon disqualification is prohibited.

## 1. TypeScript Rules
- **Configuration**: Code must compile under TypeScript 5+ with `strict: true`, `noImplicitAny: true`, and `strictNullChecks: true`.
- **Signatures**: Explicit return types must be declared on all functions.
- **Typing**: The use of `any` is strictly banned. Use `unknown` if absolute dynamic typing is required.

## 2. jssg Pattern Writing Guidelines
- **Tooling Constraint**: You **MUST** use `jssg` (JS ast-grep). Do **NOT** use jscodeshift. Use of jscodeshift incurs a major hackathon penalty.
- **Specificity**: Patterns must be hyper-specific to avoid over-matching. For example, explicitly match the AST node for `import { useNavigate } from 'react-router-dom'` instead of doing string matching for `react-router-dom`.
- **Context**: Always include surrounding syntactic context in patterns instead of isolated identifiers to guarantee accurate matching.
- **Exclusions**: Utilize negative lookaheads or explicit skips to explicitly ignore commented-out code.

## 3. Transform Safety Rules (CRITICAL)
- **Zero False Positives**: This is the absolute highest priority. Incorrect changes lead to disqualification. 
- **Penalty Awareness**: False positives in the scoring formula (`Score = 100 × (1 − ((FP × wFP) + (FN × wFN)) ÷ ...)`) mean even one incorrect change can drop your score below 80. Act accordingly.
- **Exact Matches Only**: Never modify code without a deterministic, exact syntactic match.
- **Fallback**: When in doubt or if a pattern is ambiguous due to highly dynamic usage, skip the modification and flag the line for AI review.
- **Preservation**: You must perfectly preserve original formatting, spacing, and inline comments alongside your transforms.
- **Validation Iteration**: Run the TypeScript compiler (`tsc --noEmit`) immediately after transforming a file. If the compiler fails, **revert the transform** completely.

## 4. Testing Requirements
- **Fixtures**: Every single transform rule must possess a corresponding input → expected fixture in `tests/fixtures/`.
- **Real-world Coverage**: Solutions must be validated against a minimum of 3 real open-source repositories currently utilizing React Router v6.
- **Regression**: The test runner suite must achieve and maintain a 100% pass rate.
- **Metrics**: A coverage report must be generated and maintained showing the exact percentage of automated migration (Targeting >80% automation).

## 5. AI Fallback Protocol
- **Special Commenting**: When a deterministic `jssg` transform cannot guarantee 100% safety, emit the special comment exactly as: `// CODEMOD: MANUAL REVIEW - [reason]` above the failing block.
- **Targeted AI**: The secondary AI logic step will only execute on files and nodes containing this specific comment to resolve edge cases.
- **Validation**: Any AI resolution must still preserve the file's ability to pass `tsc --noEmit`.

## 6. Commit Message Format
Strictly adhere to the following conventional commit structures for all workspace modifications:
- `feat(codemod): add [transform name]`
- `fix(codemod): address false positive in [pattern]`
- `test: add fixture for [edge case]`

## 7. Error Handling
- **Parse Failure**: If `jssg` fails to parse a file, skip the file entirely, log a precise warning, and continue the workflow.
- **Compilation Failure**: If `tsc --noEmit` fails post-transform, revert the transform to its original state and flag the file for AI/manual review.
- **Network/LLM Failure**: Should an AI fallback fail or timeout during edge-case resolution, retry exactly 3 times before deferring strictly to manual developer fallback.
