# Agent Roles: React Router v6 to v7 Codemod

This project utilizes a multi-agent system to automate the migration from React Router v6 to v7. The following specialized agents work collaboratively to ensure a zero-false-positive transformation.

## 1. Architect Agent
- **Role**: System Designer & Workflow Planner
- **Expertise**: Software Architecture, Migration Strategies, YAML, AST Workflow Design
- **Responsibilities**:
  - Designs the overarching `workflow.yaml` structure.
  - Plans the optimal sequence of AST transforms (e.g., `package.json` updates → import rewrites → future flags implementation → deprecated APIs replacement).
  - Makes high-level architectural decisions to guarantee zero false positives during the codemod process.
- **Output Files**: `workflow.yaml`, high-level architectural specs.

## 2. jssg Transforms Engineer
- **Role**: AST Transformation Specialist
- **Expertise**: TypeScript, TSX, jssg (JS ast-grep), Abstract Syntax Trees
- **Responsibilities**:
  - Writes precise AST pattern matching and rewriting rules using jssg.
  - Converts complex React Router v6 patterns into their v7 equivalents.
  - Handles edge cases and complex TypeScript/TSX transformation logic to maintain code integrity.
- **Output Files**: `*.yaml` (ast-grep rules), `*.ts` (custom transformation logic/scripts).

## 3. Test Engineer
- **Role**: Validation & Quality Assurance
- **Expertise**: Testing Frameworks, Open-Source Auditing, Quality Control
- **Responsibilities**:
  - Finds and integrates real-world, open-source repositories currently using React Router v6 to serve as test subjects.
  - Creates robust test fixtures defining exact inputs (v6) and expected outputs (v7).
  - Validates that the codemod achieves strictly zero false positives across all test suites and real-world boundaries.
- **Output Files**: Test fixtures (`__fixtures__/*`), validation reports, test scripts.

## 4. Documentation Writer
- **Role**: Technical Communicator & Marketer
- **Expertise**: Technical Writing, Markdown, Developer Experience (DX)
- **Responsibilities**:
  - Writes a compelling case study detailing the codemod's approach and success to compete for the specific $200 prize.
  - Creates a comprehensive, engaging `README.md` for the Codemod registry submission.
  - Documents the codemod's exact migration coverage percentage and supported APIs.
- **Output Files**: `README.md`, `case-study.md`.

---

## Team Coordination Rules

To ensure a seamless automated migration, the agents adhere to the following handoff protocol:

1. **Architecture to Engineering**: The Architect Agent finalizes the sequential steps in `workflow.yaml`. The jssg Transforms Engineer uses this blueprint to implement the specific AST rules.
2. **Engineering to Testing**: When the jssg Transforms Engineer completes a rule or set of rules, work is handed off to the Test Engineer. The Test Engineer runs the rule against the fixtures and real-world repos.
3. **Testing to Engineering (Feedback Loop)**: If the Test Engineer discovers false positives, broken tests, or unexpected syntax changes, the rule is kicked back to the jssg Transforms Engineer along with the failing test cases for immediate refinement.
4. **Testing to Documentation**: Once the Test Engineer validates a set of transforms with zero false positives, the Documentation Writer is notified to update the coverage metrics and integration docs.

## Quality Gates

The system halts and requests **Human Approval** under the following conditions:

- **Ambiguous Syntax Detected**: If the jssg Transforms Engineer encounters highly dynamic or abstracted routing patterns that cannot be transformed safely.
- **False Positive Failing Resolution**: If a false positive is detected by the Test Engineer and the feedback loop fails to resolve it after predefined retries.
- **Unmapped APIs**: When the workflow encounters deprecated v6 APIs that have no defined migration path mapped by the Architect Agent.
- **Final Release Review**: Before generating the final case study and packaging the codemod for the Boring AI Hackathon submission, a human must review the overall system performance and test metrics.
