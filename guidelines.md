# README.md

1. Section I: AI disclaimer.

- Always format future README updates with a 20-word AI attribution disclaimer.

2. Section II: Introduction.

- A 10-word summary sentence, a symbolic directory tree view (full), and a tech-stack overview.
- Do not add descriptions to files or directories in the README directory tree.

3. Section III: Installation.

- A step-by-step tutorial in ordered list format explaining how to install the project.
- Explicitly mention the path `/database.html` (or `/database`) for accessing the database page.

4. Section IV: Resources and license.

- Address the resources used in the project, referencing `RESOURCES.md`.
- Link the license to the `LICENSE` file.

Summary: 4 sections.

1. Section I: AI disclaimer.
2. Section II: Summary and description.
3. Section III: Installation and usage.
4. Section IV: Resources and license.

Use the 4 sections above as the reference when writing README.md.

Respect `.gitignore` and `.dockerignore` files.

Do not use any emojis in the README.md file.

No extra comments or explanations.

# Chat logs

- Store exported design conversations in `design/chat-logs/`.
- A chat log filename format is `<LLM>-<DD-MM-YYYY>.md`.
- Format each log with a `# <name of LLM used> Chat Log` heading, a `> Date: DD-MM-YYYY.` line, a `### Transcript` heading, and bold `User` and `Assistant` speaker labels.
- Summarize each exchange in clear, grammatical Markdown while preserving the requested changes and implementation results.

# Development log

- Maintain the chronological project history in `log.md`.
- Read the most recent `# DD-MM-YYYY` heading in `log.md`, then inspect Git history starting from that date.
- Add only changes not already represented in `log.md`, grouping them by the date recorded in the relevant commits.
- Summarize related commits into clear project-level milestones instead of copying commit messages verbatim.
- Keep date sections in chronological order and leave one blank line between sections.
- Use this exact format:

```markdown
# DD-MM-YYYY
- First documented change.
- Second documented change.
```

# Validation

- Before pushing TypeScript changes, run `bunx tsc --noEmit --pretty false`.
- Run `git diff --check` before pushing.
- When checking module imports, test reusable modules directly; importing `index.ts` starts the server and may fail when the configured port is already in use.

# Git Commit & Push

- Commit each changed file individually. A file rename may stage the old and new paths together as one logical file change.
- The full process is:

1. Run `git status --short` to review the working tree.
2. Run `git add <path>` for one changed file.
3. Run `git diff --staged` to review that file's staged changes.
4. Run `git commit -m "commit message"`.
5. Repeat steps 2–4 for each remaining changed file.
6. Run `git push` to upload the commits to the remote repository.

- The commit message format is:

```
<Type>: <Commit message>

<Date (DD-MM-YYYY)>

- <Commit details>
- ...
```
