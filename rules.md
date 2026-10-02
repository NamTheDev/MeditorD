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

# Git Commit & Push

- The full process is:

1. Run `git add -A` to stage all changes.
2. Run `git diff --staged` to review the staged changes.
3. Run `git commit -m "commit message"` for each file individually.
4. Run `git push` to upload the commits to the remote repository.

- The commit message format is:

```
<Type>: <Commit message>

<Date (DD-MM-YYYY)>

- <Commit details>
- ...
```
