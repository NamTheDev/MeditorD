# README.md

1. Section I: AI disclaimer.
- Always format future README updates with a 20-word AI attribution disclaimer.

2. Section II: Summary and description.
- A 10-word summary sentence, a symbolic directory tree view, and a tech-stack overview.

3. Section III: Installation and usage.
- Instructions using minimal emojis, without overview sections or code showcases.

4. Section IV: Resources and license.
- Address the resources used in the project, referencing `RESOURCES.md`.
- Link the license to the `LICENSE` file.

Summary: 4 sections.
1. Section I: AI disclaimer.
2. Section II: Summary and description.
3. Section III: Installation and usage.
4. Section IV: Resources and license.

Use the 4 sections above as the reference when writing README.md.

# Chat logs

- Store exported design conversations in `design/chat-logs/`.
- A chat log filename format is `<LLM>-<DD-MM-YYYY>.md`, example: `gemini-flash-11-09-2026.md`.
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

# Mobile Support

- The application is desktop-only.
- Detect small, touch-enabled, or recognized mobile devices in the shared layout.
- Hide the application interface and show the exact message: “Mobile is not supported. Please access this app through desktop”.