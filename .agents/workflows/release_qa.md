# Workflow: Release QA Pipeline

This multi-step automation workflow governs the release sequence for the React Router v6→v7 codemod. It runs exclusively when a set of transforms is ready for rigorous validation and publication.

**Project Target**: >80% automation, zero false positives.
**Hackathon Prize Targeting**: $800 (recipe) + $200 (case study) + $2,000 (adoption)
**Target Registry**: https://app.codemod.com/registry/

---

## PHASE 1: TEST EXECUTION

### 1.1 Run fixture tests
- **Command**: `npx codemod jssg test`
- **Expected Result**: 100% pass rate.
- **On Failure**: STOP immediately. Report all failing fixtures back to the `jssg Transforms Engineer` for refinement.

### 1.2 Run on real repositories (minimum 3)
Apply the full codemod against real open-source React Router v6 codebases.
- **Target repos:**
  - `scaffold-eth-2` (https://github.com/scaffold-eth/scaffold-eth-2)
  - `rainbowkit-app` (https://github.com/rainbow-me/rainbowkit/tree/main/examples/with-create-react-app)
  - `wagmi-example` (https://github.com/wevm/wagmi/tree/main/examples/react)
- **Command**: `npx codemod workflow run -w workflow.yaml -t [repo-path]`

### 1.3 Generate coverage report
- **Command**: `npx codemod coverage report`
- **Expected Result**: >80% automation percentage.
- **On <80%**: STOP workflow. Identify uncovered routing patterns and assign them to the engineer.

---

## PHASE 2: VALIDATION (CRITICAL)

### 2.1 Verify zero false positives
- **Command**: `git diff` across each transformed target repository.
- **Action**: Review each individual change block manually or with targeted AI-assistance.
- **Criteria**: Every change must be perfectly CORRECT without destroying formatting or logic.
- **On ANY false positive**: STOP completely. Revert the workflow backward immediately to the `jssg Transforms Engineer`.

### 2.2 TypeScript compilation validation
- **Command**: `npx tsc --noEmit` performed on each transformed repository.
- **Expected Result**: 0 errors.
- **On Errors**: Revert applied transforms and explicitly flag the broken components for review.

### 2.3 Generate validation report
- **Output File**: `docs/validation-report.md`
- **Included Details**: Total coverage percentage, precise false positive count (must equal 0), and TS compiler pass/fail logs.

---

### 🛑 HUMAN APPROVAL GATE 1
The workflow halts here. After Phase 2 completes, a human **MUST** manually confirm the validation report and `git diff` to verify absolute zero false positives before unlocking Phase 3.

---

## PHASE 3: DOCUMENTATION

### 3.1 Update README.md
Ensure the public registry has all required data:
- Update the exact coverage percentage.
- Add installation CLI instructions.
- Add before/after usage examples.
- Include a hyperlink referencing the `validation-report.md`.

### 3.2 Update case-study.md (for $200 prize)
Structure the document to secure the hackathon case study requirements:
- Document the overarching architectural migration approach.
- Highlight the automation coverage metric in the intro.
- Compare our orchestrated AI approach versus the manual migration effort.
- Showcase real-world impact through our target repository test results.

### 3.3 Generate changelog
- **Command**: `git log --oneline --since="last release" > CHANGELOG.md`

---

### 🛑 HUMAN APPROVAL GATE 2
The workflow halts again. Before moving to Phase 4 (release), a human **MUST** approve the final documentation assets (`README.md`, `case-study.md`) and grant publication access.

---

## PHASE 4: RELEASE

### 4.1 Publish to Codemod registry
- **Command 1**: `npx codemod login` *(if not currently authenticated)*
- **Command 2**: `npx codemod publish`
- **Verification Step**: Confirm the package resolves correctly at `https://app.codemod.com/registry/@[username]/react-router-v6-to-v7`.

### 4.2 Create GitHub release
- **Command**: `gh release create v1.0.0 --notes-from-tag`

### 4.3 Notify team
- **Message** to the Documentation Writer: "Case study ready for final review."
- **Message** to Human Architect: "Codemod is published and natively ready for hackathon submission!"

---

## 🚨 Error Handling Architecture
- **Phase 1 Failure** → Revert flow to `jssg Transforms Engineer` packaged with the specific failing test logs.
- **Phase 2 False Positive** → HALT entirely. Requires manual human intervention and investigation to diagnose.
- **Phase 4 Publish Failure** → Wait and retry network command exactly 3 times before defaulting to manual fallback.
