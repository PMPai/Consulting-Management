## ROLE

You are a senior cross-functional product engineering team responsible for converting an approved interactive prototype into a production-ready consulting project management application.

Act simultaneously as:

- A Professional Services Automation product manager.
- A consulting-project financial analyst.
- A senior UX/UI designer.
- A React and TypeScript frontend architect.
- A FastAPI and PostgreSQL backend architect.
- An API, security, testing, accessibility, and DevOps engineer.

The product is named “顾问项目 ROI 管理台” and is branded for 精铭数据 / PrecisionData.

Build the application rather than merely describing it. Preserve the approved design and interaction decisions, but replace all prototype-only behavior and hard-coded data with validated, secure, persistent production functionality.

Think in terms of traceability:

Project → Phase → Time Entry / Expense / Client Investment / Client Benefit → Financial and ROI Summary

Every displayed number must be traceable to stored source records and a documented calculation.

## REQUEST

### 1. Development approach

Inspect the existing prototype and repository before changing anything.

Then:

1. Document the current structure and reusable components.
2. Identify prototype-only state, hard-coded data, inactive controls, and missing backend operations.
3. Produce a concise implementation plan.
4. Implement the complete system.
5. Run database migrations, tests, type checks, production builds, and API tests.
6. Fix failures before reporting completion.
7. Do not stop after producing a plan or interface mockup.

Preserve unrelated existing files and user changes.

### 2. Product scope

Create a responsive web application for independent consultants and small consulting teams to manage:

- Clients.
- Consulting projects.
- Project phases and milestones.
- Daily time tracking.
- Detailed work records attached to time entries.
- Tool and direct project expenses.
- Consultant revenue.
- Client investments.
- Client benefits.
- Client ROI.
- Reports.
- External API integrations.
- API keys, webhooks, roles, and audit history.

The application must support multiple clients and projects.

Use organization-level data separation from the beginning, even if the first deployment initially contains one organization.

### 3. Global navigation and layout

Use a fixed left-side navigation menu.

Desktop behavior:

- Full-height fixed sidebar.
- Expanded width approximately 248px.
- Collapsed width approximately 72px.
- Independent scrolling for the main content area.
- Sidebar collapse control.
- Active menu highlighting.
- Tooltips when collapsed.
- User and role information at the bottom.

Mobile behavior:

- Sidebar becomes a drawer.
- A menu button opens it.
- Selecting a menu item closes it.
- The Gantt chart and wide tables scroll horizontally when necessary.

Menu order:

1. 总览
2. 项目
3. 我的工时
4. 工具费用
5. 客户 ROI
6. 报表
7. API 与集成
8. 设置

Use the supplied PrecisionData logo in the sidebar. Preserve the logo’s original dark navy appearance. Display it on a warm-white brand plate so it remains legible against the dark sidebar. Do not recolor, distort, crop incorrectly, or recreate the logo.

### 4. Dashboard

The Dashboard must be centered on a project Gantt chart.

Top controls:

- Project selector.
- Client filter.
- Date-range selector.
- Day, week, and month scale.
- Start timer.
- Add time entry.
- Add expense.
- Add client benefit.

Gantt chart requirements:

- Project phases displayed as horizontal time bars.
- Fixed left column containing phase name, status, owner, and progress.
- Date grid on the right.
- Start date and end date.
- Phase dependencies.
- Milestones.
- Today marker.
- Phase completion percentage.
- Planned and actual hours within the phase row, not as a separate Dashboard KPI.
- Horizontal scrolling on small screens.
- Phase detail view.
- Dragging a phase may adjust dates only after validation and confirmation.
- Invalid dates and circular dependencies must be rejected.

The approved Dashboard KPI area contains exactly these items:

- Client ROI, displayed as a circular percentage chart and positioned first.
- Project completion, displayed as a circular percentage chart.
- Consultant input cost.
- Verified client benefits.

Do not restore the removed “actual/planned hours” KPI card.

Do not restore the removed “consultant project profit” KPI card on the main Dashboard. Consultant profitability may remain available in detailed financial reports if the data exists.

Dashboard analysis section:

- Use a grouped bar chart for client investment versus verified client benefits.
- Retain the date-based horizontal axis.
- Use separate, accessible colors for investment and benefits.
- Include labels, legend, tooltips, and a text summary.
- Do not use the previously rejected line chart.
- Include phase health below or beside the financial chart.
- Phase health should compare planned hours with actual hours.
- Include data-completeness warnings with links to the missing records.

### 5. Client management

Implement client CRUD operations.

Client fields:

- ID.
- Organization ID.
- Client name.
- Client code.
- Primary contact.
- Email.
- Phone.
- Billing address.
- Default currency.
- Time zone.
- Status.
- Notes.
- Created, updated, archived, and deleted timestamps.

Rules:

- Client names are required.
- Duplicate client codes within one organization are not allowed.
- A client with active projects cannot be permanently deleted.
- Use soft deletion and allow restoration.
- Archived clients should not appear in default selectors but remain searchable.

### 6. Project management

The Projects page must provide functional:

- Project creation.
- Project detail viewing.
- Project editing.
- Project soft deletion.
- Project restoration.
- Project archiving.
- Filtering and searching.

Project fields:

- ID.
- Organization ID.
- Client ID.
- Project name.
- Project code.
- Owner.
- Objective.
- Description.
- Start date.
- End date.
- Status.
- Project currency.
- Time zone.
- Billing model: hourly, fixed fee, retainer, or hybrid.
- Internal hourly cost rate.
- Client billing rate.
- Estimated contract value.
- Estimated revenue.
- Target margin.
- Estimated client benefit.
- Created and updated timestamps.
- Archived and deleted timestamps.
- Record version.

Project card actions:

- Open project.
- Edit project.
- Archive project.
- Delete project.

“New Project” must open a working form. On successful save, the new project must appear immediately in the project list.

Editing must prefill current values and update the corresponding project after server confirmation.

Deleting must:

1. Open a confirmation dialog.
2. Explain whether related records exist.
3. Use soft deletion.
4. Never silently delete phases, time entries, expenses, investments, or benefits.
5. Offer restoration where authorized.

Project validation:

- Project name and client are required.
- End date cannot precede start date.
- Rates and amounts cannot be negative.
- Currency must use a supported ISO 4217 code.
- A stale edit must not overwrite a newer edit.
- Repeated save clicks must not create duplicate projects.
- Unauthorized users must not see or execute write actions.

### 7. Project phases and milestones

Phase fields:

- Project ID.
- Name.
- Objective.
- Description.
- Start date.
- End date.
- Status.
- Completion percentage.
- Planned hours.
- Budget.
- Owner.
- Color.
- Display order.
- Predecessor IDs.
- Created, updated, archived, and deleted timestamps.
- Record version.

Phase validation:

- End date cannot precede start date.
- Phase dates must remain within project dates unless the user explicitly extends the project.
- Completion must be between 0 and 100.
- Planned hours and budget cannot be negative.
- Dependencies cannot reference another project.
- Dependencies cannot be circular.
- Deleting a phase with related records must require reassignment, archival, or cancellation.

Milestone fields:

- Project.
- Phase.
- Name.
- Date.
- Status.
- Description.
- Completed timestamp.

### 8. Time tracking and work records

The “我的工时” page must include:

- Running timer.
- Start, pause, resume, stop, and cancel.
- Manual time entry.
- Day, week, and month views.
- Search.
- Filtering.
- Editing.
- Soft deletion.
- CSV export.
- Weekly totals.
- Billable and non-billable summaries.

Time-entry fields:

- Organization ID.
- User ID.
- Client ID through project relation.
- Project ID.
- Optional phase ID.
- Work date.
- Start time.
- End time.
- Duration in minutes.
- Billable status.
- Internal cost-rate snapshot.
- Client billing-rate snapshot.
- Calculated labor cost.
- Calculated billable amount.
- Source: manual, timer, or external API.
- Created and updated timestamps.
- Deleted timestamp.
- Record version.

Work-record fields attached to every time entry:

- `activitySummary`: required summary of the main activity.
- `activityDetails`: optional detailed description.
- `workResult`: optional outcome or deliverable.
- `nextAction`: optional next step.
- `tags`: multiple searchable tags.
- `referenceLinks`: zero or more related links.
- `visibility`: private, internal team, or client-visible.

Timer behavior:

- A user may have only one active timer unless an administrator explicitly changes this rule.
- Starting a second timer must show the current timer and offer to return to it or stop it.
- Stopping a timer must open a confirmation form.
- `activitySummary` is mandatory before the stopped timer can be saved.
- The user can add or edit the work record while the timer is running.
- Canceling a timer requires confirmation if elapsed time exists.
- The server, not the browser, is the authoritative source for elapsed time.
- Refreshing or closing the browser must not lose an active timer.
- Duplicate stop requests must be idempotent.
- Overlapping manual entries must trigger a warning.
- Negative or zero durations must be rejected unless an explicit zero-duration note type is later introduced.

Work-record search:

- Search activity summary, details, result, next action, tags, and links.
- Filter by client, project, phase, user, date, tag, billable status, source, and visibility.
- Highlight matched terms.
- Support pagination and sorting.
- Preserve filters in URL parameters.
- Respect permissions and visibility.
- Client-visible exports must never include private or internal-only work records.

Calculations:

- Labor cost = duration in hours × saved internal cost-rate snapshot.
- Billable amount = billable duration in hours × saved billing-rate snapshot.
- Changing a project’s current rate must not rewrite historical time-entry snapshots.

### 9. Tool and direct expenses

Expense fields:

- Organization ID.
- Project ID.
- Optional phase ID.
- Date.
- Expense or tool name.
- Category.
- Supplier.
- Original amount.
- Original currency.
- Project-currency amount.
- Exchange rate.
- Exchange-rate date.
- Billable-to-client flag.
- Charged-to-client flag.
- Reimbursement status.
- Notes.
- Receipt metadata.
- Source.
- Created, updated, and deleted timestamps.
- Record version.

Categories:

- AI tools.
- SaaS software.
- Cloud services.
- Data services.
- Travel.
- Contractors.
- Equipment.
- Other.

Rules:

- Every expense must belong to a project.
- A phase is optional.
- Amounts cannot be negative.
- If currencies differ, the exchange rate and rate date are required.
- Do not invent exchange rates.
- Records missing exchange-rate information may be saved as incomplete but must not enter official financial totals.
- Clearly distinguish consultant-paid and client-pass-through expenses.
- Historical exchange-rate snapshots must remain unchanged.

### 10. Consultant revenue

Record consultant revenue without building a complete invoicing system.

Revenue fields:

- Organization ID.
- Project ID.
- Optional phase ID.
- Date.
- Revenue type.
- Amount.
- Currency.
- Status: estimated, confirmed, or received.
- External reference.
- Notes.
- Created, updated, and deleted timestamps.

Consultant profitability may appear in detailed reports:

- Consultant project profit = confirmed consultant revenue − labor cost − consultant-paid direct expenses.
- Consultant margin = consultant project profit ÷ confirmed consultant revenue × 100%.
- If confirmed revenue is zero, margin must be `null`, not 0%.

Do not confuse consultant profitability with client ROI.

### 11. Client investments, benefits, and ROI

Client-investment fields:

- Organization ID.
- Project ID.
- Optional phase ID.
- Date.
- Investment type.
- Amount.
- Currency.
- Project-currency amount.
- Exchange rate and rate date.
- Description.
- Evidence.
- Confirmation status.
- Created, updated, and deleted timestamps.

Investment types:

- Consulting fees.
- Client internal labor.
- Client software or tools.
- Implementation.
- Training.
- Other.

Client-benefit fields:

- Organization ID.
- Project ID.
- Optional phase ID.
- Benefit name.
- Benefit type.
- Observation start and end dates.
- Amount.
- Currency.
- Project-currency amount.
- One-time or recurring.
- Calculation method.
- Baseline description.
- Data source.
- Evidence link.
- Notes.
- Confidence: high, medium, or low.
- Status: estimated, pending verification, verified, or rejected.
- Verified by.
- Verified timestamp.
- Created, updated, and deleted timestamps.

Benefit types:

- Incremental revenue.
- Labor savings.
- Tool or operating-cost savings.
- Loss avoidance.
- Monetized efficiency gain.
- Other measurable benefit.

ROI formulas:

- Official verified benefit = verified benefits within the selected date range.
- Estimated or pending benefits must not enter official ROI.
- Client investment = confirmed consulting fees + confirmed client internal investment + confirmed client tools and implementation costs.
- Client net benefit = verified benefit − client investment.
- Client ROI = client net benefit ÷ client investment × 100%.

If client investment is zero, missing, or incomplete:

- Return `roi: null`.
- Display “无法计算”.
- Explain exactly which inputs are missing.
- Never display missing ROI as 0%.

Every ROI response must include a calculation breakdown and source record IDs.

### 12. Reports

Implement:

- Project overview.
- Phase planned-versus-actual report.
- Time-entry detail report.
- Work-record search and export.
- Expense report.
- Consultant profitability report.
- Client investment, benefit, and ROI report.
- Data-completeness report.
- Audit-history report for authorized users.

Reports must support:

- Client, project, phase, user, date, status, and tag filtering.
- Server-side pagination.
- Sorting.
- CSV export with correct escaping and UTF-8 encoding.
- Print-friendly layout.
- Permission-aware field visibility.
- A clear “generated at” timestamp and applied-filter summary.

### 13. API and external integrations

Use RESTful JSON endpoints under:

`/api/v1`

Provide CRUD operations for:

- organizations
- users
- clients
- projects
- phases
- milestones
- timers
- time-entries
- tool-expenses
- revenue-entries
- client-investments
- benefit-entries
- API keys
- webhook subscriptions
- audit logs, read-only

Standard operations:

- `GET /api/v1/{resource}`
- `GET /api/v1/{resource}/{id}`
- `POST /api/v1/{resource}`
- `PATCH /api/v1/{resource}/{id}`
- `DELETE /api/v1/{resource}/{id}`
- `POST /api/v1/{resource}/{id}/restore`

List APIs must support the relevant subset of:

- `page`
- `pageSize`
- `sortBy`
- `sortOrder`
- `q`
- `clientId`
- `projectId`
- `phaseId`
- `userId`
- `fromDate`
- `toDate`
- `status`
- `tags`
- `visibility`
- `includeDeleted`

Aggregation APIs:

- `GET /api/v1/dashboard`
- `GET /api/v1/projects/{id}/gantt`
- `GET /api/v1/projects/{id}/time-summary`
- `GET /api/v1/projects/{id}/financial-summary`
- `GET /api/v1/projects/{id}/roi-summary`
- `GET /api/v1/projects/{id}/data-completeness`

The frontend must use the same APIs available to external systems. Do not create separate, inconsistent calculation paths.

Successful response:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "page": 1,
    "pageSize": 20,
    "total": 1
  },
  "error": null
}
```

Error response:

```json
{
  "data": null,
  "meta": {
    "requestId": "uuid"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Project end date cannot precede its start date.",
    "details": []
  }
}
```

API operational requirements:

- UUID external identifiers.
- OpenAPI 3.1.
- Interactive API documentation.
- JWT user authentication.
- Revocable API keys.
- API-key scopes.
- Organization-level isolation.
- Server-side validation.
- Rate limiting.
- CORS allowlist.
- Request IDs.
- Idempotency keys for create operations.
- Optimistic concurrency through record versions or `If-Match`.
- Consistent 4xx and 5xx errors.
- No stack traces returned to clients.
- Audit logging for all write operations.
- Postman or Bruno collection.
- External CRUD examples.

Webhook events:

- `project.created`
- `project.updated`
- `project.deleted`
- `phase.updated`
- `time_entry.created`
- `time_entry.updated`
- `tool_expense.created`
- `benefit_entry.created`
- `benefit_entry.verified`
- `client_investment.updated`

Webhooks must use:

- HMAC signatures.
- Unique event IDs.
- Delivery logs.
- Exponential retry with a maximum attempt count.
- Duplicate-delivery documentation.
- Secret rotation.
- Disabled status after repeated permanent failures.
- No delivery of fields outside the subscriber’s authorized organization.

### 14. Authentication and permissions

Roles:

Owner:

- Full organization administration.
- User and API-key management.
- Financial and audit access.

Consultant:

- Manage authorized clients, projects, time records, expenses, and benefit records.
- Cannot manage organization ownership or unrestricted API keys.

Viewer:

- Read-only access within assigned scope.
- No write, delete, restore, or API-key actions.

Enforce permissions on the server. Hiding buttons is not sufficient security.

Visibility rules for work records must also be enforced on the server.

### 15. Audit and history

Core records must contain:

- `id`
- `organizationId`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `createdBy`
- `updatedBy`
- `version`

Audit events must record:

- Request ID.
- Actor or API key.
- Source.
- Timestamp.
- Organization.
- Resource type.
- Resource ID.
- Operation.
- Before-and-after summaries.
- Failure status when relevant.

Sensitive values such as passwords, tokens, API-key secrets, and webhook secrets must never appear in audit logs.

### 16. Data completeness

Return explicit states such as:

- `COMPLETE`
- `MISSING_EXCHANGE_RATE`
- `MISSING_CLIENT_INVESTMENT`
- `NO_VERIFIED_BENEFITS`
- `MISSING_REVENUE`
- `PARTIAL_DATA`

Dashboard and report interfaces must explain these states in plain language and link to the relevant entry form.

### 17. Operational-error prevention

Implement the following safeguards:

- Disable submit buttons while requests are pending.
- Protect create operations from double submission.
- Use idempotency keys for externally retried creates.
- Show clear saving, saved, failed, and retry states.
- Roll back optimistic UI changes when the server rejects them.
- Warn before navigating away from unsaved forms.
- Confirm destructive actions.
- Use soft deletion for business records.
- Prevent stale edits from overwriting newer changes.
- Keep user input after a recoverable server error.
- Validate on both client and server.
- Reject invalid foreign-key relationships.
- Use transactions for multi-record financial changes.
- Avoid partial writes.
- Store timestamps in UTC.
- Display timestamps in the user’s selected time zone.
- Preserve historical rates and exchange-rate snapshots.
- Return `null` for undefined financial ratios.
- Make retries safe.
- Handle lost network connections gracefully.
- Provide loading, empty, incomplete, error, unauthorized, and not-found states.
- Do not expose raw database errors.
- Sanitize user-entered text and URLs.
- Protect against XSS, SQL injection, broken object authorization, CSRF where applicable, mass assignment, and unrestricted file uploads.
- Redact secrets and personal data from logs.
- Add health and readiness endpoints.
- Use structured logs and request correlation IDs.
- Ensure development seed data cannot run accidentally in production.
- Use reversible database migrations and document rollback procedures.
- Back up the database before destructive production migrations.

### 18. Technical architecture

Prefer the following production architecture unless the existing repository has an equally suitable established stack:

Frontend:

- React.
- TypeScript strict mode.
- Existing approved component and styling system.
- TanStack Query.
- React Hook Form.
- Zod.
- Accessible charting solution.
- Accessible Gantt implementation with a suitable commercial-use license.
- Generated or shared API client based on OpenAPI.

Backend:

- Python.
- FastAPI.
- Pydantic.
- SQLAlchemy.
- Alembic.
- PostgreSQL.

Engineering:

- Docker Compose for local development.
- Separate frontend and backend services.
- Environment-based configuration.
- Database migrations.
- Seed data for development only.
- pytest.
- Frontend unit tests.
- API integration tests.
- Playwright end-to-end tests.
- ESLint.
- Python linting and formatting.
- Production container builds.

Keep business calculations in a dedicated, independently tested domain layer.

### 19. Implementation order

Execute in this order:

1. Inspect the approved prototype and repository.
2. Document current gaps and architecture.
3. Define database entities and relationships.
4. Define calculation rules and tests.
5. Create reversible database migrations.
6. Implement authentication and organization isolation.
7. Implement project and client APIs.
8. Implement phase, milestone, and Gantt APIs.
9. Implement timer, time entry, and work-record APIs.
10. Implement expenses and revenue.
11. Implement client investment, benefit, and ROI.
12. Connect the approved frontend to the production APIs.
13. Implement reports.
14. Implement API-key and webhook management.
15. Add audit logging.
16. Add error and data-completeness states.
17. Add automated tests.
18. Run migrations in a clean test database.
19. Run all checks and production builds.
20. Fix failures.
21. Update documentation.
22. Provide an evidence-based completion report.

## RESOURCE

Use these resources as the sources of truth:

### 1. Approved interactive prototype:

https://consulting-roi-6r-0811.pmpai134.chatgpt.site

### 2. Existing project repository and current source files.

### 3. PrecisionData logo supplied by the user:

`精銘數據Logo.png`

### 4. Approved visual direction:

- Dark navy fixed sidebar.
- Warm-white content background.
- Blue primary actions.
- Teal verified-benefit and positive-value accents.
- Restrained amber warnings.
- Red only for destructive actions and errors.
- Modern professional consulting workspace.
- Compact but readable information density.
- Gantt chart as the dominant Dashboard element.

### 5. Approved Dashboard changes:

- Client ROI is a circular chart and appears first.
- Project completion is a circular chart.
- Actual/planned hours KPI is removed.
- Consultant project profit KPI is removed from the main Dashboard.
- Investment-versus-benefit visualization is a grouped bar chart.
- Project creation, editing, opening, and deletion must be functional.

### 6. Product references may be used for patterns, not copied visually:

- Kantata for professional-services time, expense, and financial relationships.
- Teamwork for client-project budget and profitability concepts.
- Productive for Gantt, project phases, and project-level financial tracking.

### 7. Missing deployment-specific resources that may be requested only when required:

- Production domain.
- Production cloud account.
- Email provider.
- OAuth credentials.
- Real API secrets.
- Production database credentials.
- Final data-retention policy.
- Final backup destination.

## RESTRAIN

- Do not redesign the approved product without a clear functional necessity.
- Do not replace the PrecisionData logo with an invented logo.
- Do not copy another platform’s interface.
- Do not restore UI elements explicitly removed during review.
- Do not leave visible buttons inactive.
- Do not use hard-coded production data.
- Do not make frontend state the system of record.
- Do not access PostgreSQL directly from browser code.
- Do not duplicate financial formulas across frontend and backend.
- Do not confuse client ROI with consultant profitability.
- Do not count estimated benefits in official ROI.
- Do not invent missing client investments, revenue, benefits, or exchange rates.
- Do not display missing values as zero.
- Do not use floating-point numbers for money.
- Do not recalculate historical records using current rates.
- Do not physically delete business records through normal UI or API operations.
- Do not cascade-delete related financial or time records silently.
- Do not rely on hidden buttons for authorization.
- Do not expose data across organizations.
- Do not store plaintext passwords, API keys, or webhook secrets.
- Do not commit actual secrets or credentials.
- Do not return stack traces or SQL errors through APIs.
- Do not log sensitive authentication data.
- Do not allow unrestricted CORS in production.
- Do not allow duplicate timer sessions, duplicate form submissions, or unsafe retry behavior.
- Do not overwrite concurrent edits without detecting the conflict.
- Do not make destructive production changes without backup and rollback instructions.
- Do not claim a feature is complete unless it has been tested.
- Do not report deployment success without observable confirmation.
- Do not stop for noncritical design questions; follow the approved prototype.
- Ask for user input only when real credentials, external service authorization, irreversible external actions, or a material business-policy decision is required.

## RESULT

### Deliver a production-ready application containing:

- Responsive approved frontend.
- PrecisionData branding.
- Fixed left navigation.
- Dashboard with Gantt chart.
- Approved KPI arrangement.
- Grouped investment-versus-benefit bar chart.
- Client CRUD.
- Project CRUD, archive, restore, and details.
- Phase and milestone management.
- Timer and manual time entries.
- Searchable detailed work records.
- Tool and direct expenses.
- Consultant revenue records.
- Client investments and benefits.
- Client ROI calculations.
- Reports and CSV exports.
- REST API for external CRUD.
- JWT and API-key authentication.
- Role and visibility enforcement.
- Webhooks.
- Audit history.
- Data-completeness handling.
- OpenAPI documentation.
- Database migrations.
- Development seed data.
- Automated tests.
- Docker-based local setup.
- Production build.
- Complete documentation.

### Required documentation:

- Product overview.
- Architecture.
- Entity-relationship description.
- Directory structure.
- Local setup.
- Environment variables.
- Database migration instructions.
- Seed-data instructions.
- Authentication.
- Roles and permissions.
- API-key setup.
- API examples.
- Webhook signing and retry behavior.
- ROI formulas.
- Consultant financial formulas.
- Data-completeness rules.
- Backup and migration rollback.
- Testing commands.
- Production-build instructions.
- Known limitations.
- Future improvements.

### Acceptance tests must confirm:

- A user can create, view, edit, archive, delete, and restore a project.
- Double-clicking save creates only one project.
- Invalid project dates are rejected.
- A stale edit receives a conflict response.
- A phase appears correctly on the Gantt chart.
- Circular phase dependencies are rejected.
- A timer survives browser refresh.
- A second active timer is prevented.
- Stopping a timer requires an activity summary.
- Work records are searchable.
- Private work records are not exposed to viewers or client exports.
- Historical rate snapshots remain unchanged after rate updates.
- Expenses without required exchange rates are excluded from official totals.
- Verified benefits affect official ROI.
- Estimated benefits do not affect official ROI.
- Missing investment returns `roi: null`.
- Soft-deleted records are excluded from summaries.
- Restored records return to the appropriate summaries.
- External API CRUD updates appear in the web interface.
- API operations respect scopes and organization boundaries.
- Webhook signatures can be verified.
- Duplicate webhook deliveries can be handled safely.
- Unauthorized users receive correct 401 or 403 responses.
- Invalid resources return 404.
- Validation failures return structured 422 or appropriate 4xx responses.
- Unexpected errors return a safe 500 response with a request ID.
- CSV output handles Chinese text, commas, quotes, and line breaks correctly.
- Mobile navigation, tables, and Gantt scrolling work.
- Keyboard navigation and dialog focus behavior work.
- Type checks pass.
- Lint checks pass.
- Unit tests pass.
- API integration tests pass.
- End-to-end tests pass.
- Production builds succeed.
- A clean database can be migrated and seeded.
- No inactive primary buttons remain.
- No secrets are present in committed files.

### The final completion report must state:

- What was implemented.
- What was verified.
- Exact test and build results.
- Database migration status.
- API documentation location.
- Remaining limitations.
- Any real credentials or deployment decisions still needed from the user.
- Which items are implemented versus merely proposed.

## REFERENCE

Follow the approved prototype’s interface hierarchy and visual language.

Primary interface reference:

https://consulting-roi-6r-0811.pmpai134.chatgpt.site

Visual tokens:

- Sidebar: `#0B1F3A`
- Sidebar hover: `#16345F`
- Active navigation: `#1E4F8F`
- Main background: `#F6F8FB`
- Card background: `#FFFFFF`
- Primary text: `#172033`
- Secondary text: `#64748B`
- Borders: `#DCE3EC`
- Primary blue: `#2563EB`
- Verified benefit: `#0F766E`
- Warning: `#D97706`
- Error and destructive action: `#DC2626`

Typography:

- Chinese: Noto Sans SC, Noto Sans TC, or an appropriate system sans-serif.
- English and numerals: Inter or a suitable system sans-serif.
- Use tabular numerals for financial values and durations.

Interaction examples:

- Clicking “新建项目” opens a validated project form.
- Clicking “编辑” opens the same form with existing data.
- Clicking “删除” opens a confirmation dialog and performs a soft delete only after confirmation.
- Clicking “打开项目” opens the project detail view.
- Stopping a timer opens the work-record form and requires a work summary.
- Clicking a Dashboard warning opens the exact missing-data workflow.
- Clicking a KPI or chart segment opens its calculation breakdown or filtered source records.

Favor clarity, traceability, restrained visual design, and safe operations over decorative complexity.
