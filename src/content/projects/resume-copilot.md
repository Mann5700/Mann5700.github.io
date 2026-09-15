---
title: Resume CoPilot
tagline: Job discovery and factual resume tailoring
description: >-
  An LLM-powered pipeline that finds live postings across fragmented, undocumented
  job boards and generates a tailored, ATS-scored resume for each one — without
  inventing a single line of experience.
featured: true
order: 2
year: 2026
status: shipped
theme: ion
technologies:
  - Python
  - FastAPI
  - OpenAI
  - BeautifulSoup
  - httpx
  - React
  - TypeScript
  - Tailwind CSS
  - Docker
problem: >-
  Applying well means rewriting one resume for every posting, and the postings worth
  applying to are scattered across career pages that share no schema, no API and no
  consistency. Doing both properly does not scale past a handful of applications.
approach: >-
  A seven-stage async backend that parses the resume once, discovers fresh postings in
  parallel, validates each employer against a confidence-scored registry, calculates a
  weighted ATS match, rewrites the resume for the target role under strict factual
  constraints, and renders a deterministic PDF per match.
architecture:
  - Async FastAPI orchestrator with typed Pydantic v2 models and staged progress reported to the UI.
  - Resume parsing across PDF and DOCX for skills, education, certifications and work history.
  - Parallel job discovery with recency filtering over HTML sources using httpx and BeautifulSoup.
  - Confidence-scored, fully auditable employer classification — every decision records its reasons.
  - Weighted ATS scoring with a per-category breakdown and a before/after comparison.
  - React + TypeScript frontend with drag-and-drop upload, a progress timeline, a sortable TanStack grid and an in-browser PDF preview.
decisions:
  - title: The AI engine is swappable, with no code change
    detail: >-
      Tailoring runs against one of three interchangeable providers — OpenAI, a fully
      offline deterministic heuristic, or a self-built bridge to local models — selected
      by configuration. The app still works with no API key at all.
  - title: Factual integrity is a constraint, not a guideline
    detail: >-
      Prompts forbid fabricated history. The rewrite is allowed to reframe and
      re-prioritise real experience and nothing else, because a resume that invents
      things is worse than no resume.
  - title: Built to survive its dependencies
    detail: >-
      Automatic retries with exponential backoff, request throttling and response
      caching mean an unreachable source degrades one result instead of failing the run.
  - title: Scoring you can argue with
    detail: >-
      The ATS engine shows a weighted breakdown and a measurable before/after delta for
      every tailored resume, so the improvement is inspectable rather than asserted.
outcomes:
  - value: 7
    label: Pipeline stages, individually reported
  - value: 3
    label: Interchangeable AI providers
  - value: 0
    label: API keys required to run it
links:
  github: https://github.com/Mann5700/Job-Application-Resume-CoPilot
---

The interesting constraint in this project was not the language model — it was
everything around it. Job sources go down, rate-limit, change their markup and return
partial pages. A pipeline that assumes any of them are reliable produces a tool that
works on the day you build it.

So the backend is designed to degrade instead of fail: sources are fetched in parallel
and independently, failures are retried with backoff and then dropped, and the tailoring
step has a deterministic offline path that requires no API key. The result is a system
that still returns a usable set of tailored resumes when half of what it depends on is
unavailable.

The frontend exists to make the pipeline legible — a live stage timeline, a sortable
grid of matches with before/after scores, and an in-browser preview of the generated PDF
so a decision takes seconds instead of a download.
