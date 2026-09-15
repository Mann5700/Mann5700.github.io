---
title: My Finance Tracker
tagline: Type-safe personal finance, end to end
description: >-
  A full-stack MERN finance tracker where one TypeScript definition describes a
  record on both the client and the server, and authentication is delegated rather
  than reinvented.
featured: false
order: 4
year: 2026
status: shipped
theme: void
technologies:
  - React
  - TypeScript
  - Node.js
  - Express
  - MongoDB
  - Mongoose
  - Clerk
  - Vite
problem: >-
  Small full-stack apps drift: the client's idea of a record and the server's idea of a
  record diverge, state gets copied into three components, and hand-rolled auth becomes
  the least reviewed code in the project.
approach: >-
  Keep one shared type for a finance record across both sides of the wire, centralise app
  data in a single React context, and hand authentication to a provider so no password or
  session code exists in the codebase at all.
architecture:
  - Four-endpoint RESTful CRUD API over user-scoped finance records, backed by a Mongoose schema with required-field validation.
  - Clerk-managed authentication — every record is scoped to the signed-in user.
  - A typed React context shared by the whole dashboard, so no component keeps its own copy of the data.
  - Tabular record view powered by React Table, with SPA routing between the dashboard and sign-in.
decisions:
  - title: One type, both sides
    detail: >-
      The FinanceRecord shape is defined once and mirrored across client and server, so
      a field rename is a compile error rather than a runtime surprise.
  - title: Don't write auth
    detail: >-
      Delegating sessions to Clerk removed the entire class of password and session bugs
      from the project. The tradeoff — a third-party dependency — is worth it here.
  - title: One source of truth in the UI
    detail: >-
      A single context provider owns records and the API calls that mutate them, which
      is what keeps the totals and the grid from disagreeing.
links:
  github: https://github.com/Mann5700/My-Finance-Tracker
---

Deliberately small, and built to stay correct while it is small. The interesting parts
are the boundaries: where the type is defined, who owns the state, and which problems
were solved by not writing code for them.
