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

### UI specification as a quality baseline

- The existing UI specification is the minimum consistency baseline for typography, component semantics, sizing, spacing, states, and accessibility; it is not a ceiling on visual quality.
- Do not use specification compliance to justify mechanical, dated, or low-quality interfaces.
- Improve hierarchy, visual finish, feedback, and industry maturity without breaking brand consistency or component semantics.
- Design complex data-dense pages, tables, progress and capacity views, and file-management workflows around their real user tasks.
- Public components must enable page-level innovation instead of forcing every page into the same low-level presentation.
- Every complex UI task must include competitor research, an interaction audit, and browser acceptance at the target viewports.

## Production-like user experience

- 本规则永久生效，并优先于单次任务中的临时展示文案。
- 所有用户可见页面、组件、状态和提示必须按正式产品标准呈现。
- 禁止在用户界面、页面标题、URL 和普通操作路径中出现演示、Mock、示例、测试、原型、占位、任务编号或其他暴露开发状态的表达。
- 每次前端任务完成后，Codex 必须扫描用户可见文案并修复上述泄漏。
- 不得虚构实际未发生的支付、订单、资源、库存、审批、IP、密码、密钥、凭据或其他后端结果。
- 对未接入真实后端的操作，使用正式且准确的提交、受理、处理中、准备中或等待交付状态。
- 内部工程实现可以保留 fixture、seed 或 stub，但不得将其命名和状态暴露给用户。

## Visual review workflow

- Codex不得为用户生成、保存、提交或在最终回复中展示页面评审截图。
- 不得创建新的页面截图目录或截图文件。
- 已存在的`artifacts/`仍保持Git忽略。
- Codex可以使用浏览器工具进行临时视觉检查，但不得将临时截图保留为项目文件。
- 每次前端页面任务完成后，必须启动本地开发服务器进行浏览器检查。
- 最终回复只提供启动命令、本地访问地址、需要用户重点检查的页面和交互，以及自动化检查结果。
- 最终视觉验收由用户自行在浏览器中完成。

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
npm run build:offline
npm run verify:offline
```

Do not report a code task complete while required checks fail. If a script does not yet exist, add it in the engineering-initialization phase or state the gap explicitly.

## Offline delivery

- 每次影响正式页面的修改完成后，必须重新执行 `npm run build:offline`。
- 离线 HTML 构建或 `npm run verify:offline` 失败时，任务不得标记为完成。
- `release/算力资源服务平台.html` 必须可通过 `file://` 直接打开，且不得依赖服务器、同目录运行资产或外部网络。

## Codex token efficiency — permanent

- 此规则适用于所有后续 Codex 任务。
- 在不降低正确性、功能完整性、测试覆盖、视觉质量和验收质量的前提下，主动减少 token 使用。
- 只读取当前任务直接相关的文件，优先最小修改，不做无关重构。
- 不重复复述既有需求和背景，不输出冗长计划、完整文件清单或完整测试日志。
- 已在项目文档中明确的规则只引用路径，不重复粘贴。
- 测试结果只汇报通过、失败及必要错误。
- 最终报告只保留：根因与关键修改、检查结果、本地启动命令和验收地址、未解决事项。
- 精简不得以省略必要实现、测试或浏览器检查为代价。

## Completion standard

A phase is complete only when:

- Its pages and components meet the outputs in `docs/analysis/10-implementation-plan.md`.
- Confirmed requirements are traceable and temporary assumptions remain visibly temporary.
- Required interaction states and navigation paths work without dead controls.
- Shared data is consistent across marketplace, resources, storage, network, orders, and operation records.
- Relevant items in `docs/analysis/09-prototype-acceptance-checklist.md` pass.
- TypeScript, Lint, tests, build, and browser checks pass for code-bearing phases.
