# Ralph Loop Agent Instructions

You are running inside an automated Ralph Loop iteration for the **PerfLens** codebase.

Your objective in each iteration is to execute **exactly ONE** eligible task from `.ralph/prd.json`, verify it rigorously against all acceptance criteria, commit it cleanly, and update task status.

---

## Operating Rules (Non-Negotiable)

1. **Do NOT redesign or rewrite the application.**
2. **Do NOT delete or replace existing working functionality.**
3. **Treat the current codebase as the source of truth.**
4. **Preserve existing UI/UX** unless the task explicitly specifies an interface change.
5. **Inspect before editing:** You MUST read the existing implementation of all `target_files` before proposing or making changes.
6. **Stay strictly in scope:** Never edit files outside `target_files` unless an exact dependency import requires it.
7. **Verification required:** Run every command in the task's `validation.commands` array and confirm 0 errors before marking complete.
8. **One task per iteration:** Do not execute multiple tasks in a single turn. Complete the task, commit, log progress, and exit.

---

## Step-by-Step Iteration Workflow

### Step 1: Read PRD & Select Next Task
1. Read `.ralph/prd.json`.
2. Find the first task where:
   - `"passes": false`
   - All IDs listed in `"dependencies"` have `"passes": true`
3. If no tasks match (all tasks have `"passes": true`), announce:
   `🎉 All Ralph PRD tasks have been successfully completed and verified!`
   and stop.

### Step 2: Deep Inspection
1. Read the `context`, `description`, and `acceptance_criteria` for the selected task.
2. Use `view_file` or equivalent file-reading tool to inspect the full contents of all files in `"target_files"`.
3. Note relevant types, function signatures, and surrounding comments. Maintain code style and conventions described in `.planning/codebase/CONVENTIONS.md`.

### Step 3: Implement Surgical Changes
1. Apply the minimal necessary edits to satisfy the acceptance criteria.
2. Do not refactor unrelated sections or remove working logic.
3. Preserve all comments and existing error handling unless the task specifies otherwise.

### Step 4: Run Quality Gates & Validation
Run every command in `"validation.commands"` sequentially:
```bash
# Example
npm test
npm run lint
npm run build
```
- If any command fails or produces unexpected warnings, analyze the output, fix the problem, and re-run.
- Do NOT proceed to committing until ALL validation commands pass cleanly.

### Step 5: Update PRD & Log Progress
1. Update `.ralph/prd.json` to set `"passes": true` for the completed task ID.
2. Append an entry to `.ralph/progress.txt`:
   ```
   [YYYY-MM-DD HH:MM:SS] COMPLETED <TASK-ID>: <title>
   - Validation: PASSED (<commands executed>)
   - Files Modified: <list of files>
   ```

### Step 6: Clean Git Commit
Execute a clean git commit staging only the modified task files, `.ralph/prd.json`, and `.ralph/progress.txt`:
```bash
git add <target_files> .ralph/prd.json .ralph/progress.txt
git commit -m "<commit_message from prd.json>"
```

### Step 7: Complete Turn
Report completion with:
- Task ID and Title
- Changes made
- Validation command outputs
- Git commit hash
- Next pending task in queue
