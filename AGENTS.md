# Project Instructions

This repository is for a high-fidelity interactive prototype of an enterprise computing-resource service platform.

## Read first

Before changing product behavior or UI, read these files in order:

1. [`docs/analysis/01-requirements-baseline.md`](docs/analysis/01-requirements-baseline.md)
2. [`docs/analysis/02-decision-log.md`](docs/analysis/02-decision-log.md)
3. [`docs/analysis/03-open-questions.md`](docs/analysis/03-open-questions.md)
4. [`docs/analysis/04-information-architecture.md`](docs/analysis/04-information-architecture.md)
5. [`docs/analysis/05-page-inventory.md`](docs/analysis/05-page-inventory.md)
6. [`docs/analysis/06-user-flows.md`](docs/analysis/06-user-flows.md)
7. [`docs/analysis/07-ui-spec-extraction.md`](docs/analysis/07-ui-spec-extraction.md)
8. [`docs/analysis/08-page-component-mapping.md`](docs/analysis/08-page-component-mapping.md)
9. [`docs/analysis/09-prototype-acceptance-checklist.md`](docs/analysis/09-prototype-acceptance-checklist.md)
10. [`docs/analysis/10-implementation-plan.md`](docs/analysis/10-implementation-plan.md)

## Original sources

- Meeting transcript: [`docs/source/01-meeting-transcript.md`](docs/source/01-meeting-transcript.md)
- Post-meeting corrections: [`docs/source/02-meeting-followup.md`](docs/source/02-meeting-followup.md)
- UI specification: [`docs/source/03-ui-design-spec.pdf.pdf`](docs/source/03-ui-design-spec.pdf.pdf)

These are the only source files. Do not create duplicate `.txt`, `.pdf`, or renamed copies to match documentation. The UI specification's OneAiNexus name and Logo are design-source references, not the confirmed product brand.

## Requirement precedence

Resolve conflicts in this order:

1. Explicit post-meeting corrections.
2. Decisions explicitly approved in the meeting.
3. Multi-participant consensus.
4. Meeting suggestions.
5. Documented inference.
6. UI completion details.

Business requirements override UI examples on behavior. UI specifications govern layout, visual style, and component interaction only.

## Product rules

- Do not invent pricing, payment, approval, permission, billing, resource-state, order-state, or data-definition rules.
- Do not implement an open question as a confirmed rule. Use only the documented temporary assumption, keep it centralized, and link it to the relevant `OQ-*` item.
- Keep memory, system disk, local data storage, and high-performance shared storage semantically distinct. `30 GB` is the temporary default system-disk capacity, never memory.
- Do not merge managed Notebook, training, inference, Token, or model-product workflows from the AI development platform into this product.
- Do not hardcode OneAiNexus or any other unconfirmed final product name or Logo. Product identity must be configurable.

## UI and interaction

- Use shared Design Tokens and public components defined by the UI extraction and component mapping. Do not scatter duplicate raw values through pages.
- Do not use screenshots as page implementations.
- Do not use large amounts of absolute positioning for application layout.
- Every clickable control must provide visible feedback or a clear disabled reason.
- Cover applicable Loading, Empty, Error, Disabled, Focus, Success, and retry states.
- Preserve documented PDF conflicts; component-specific rules take precedence until design confirms otherwise.
- New components outside the PDF must be documented in `docs/analysis/08-page-component-mapping.md` with their requirement basis and state coverage.

## Checks after code changes

Run the project-defined equivalents of:

1. TypeScript type checking.
2. Lint.
3. Automated tests relevant to the change.
4. Production build.
5. Browser smoke checks for changed routes and the affected user flow.

Current project commands:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Do not report a code task complete while required checks fail. If a script does not yet exist, add it in the engineering-initialization phase or state the gap explicitly.

## Completion standard

A phase is complete only when:

- Its pages and components meet the outputs in `docs/analysis/10-implementation-plan.md`.
- Confirmed requirements are traceable and temporary assumptions remain visibly temporary.
- Required interaction states and navigation paths work without dead controls.
- Shared data is consistent across marketplace, resources, storage, network, orders, and operation records.
- Relevant items in `docs/analysis/09-prototype-acceptance-checklist.md` pass.
- TypeScript, Lint, tests, build, and browser checks pass for code-bearing phases.
