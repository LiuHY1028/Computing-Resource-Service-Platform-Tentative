import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Checkbox,
  EmptyTable,
  Form,
  FormActions,
  FormAnchorNav,
  FormField,
  FormSection,
  Grid,
  GridItem,
  Input,
  Modal,
  Pagination,
  PromptModal,
  Radio,
  RadioGroup,
  Select,
  Table,
  TextButton,
  Textarea,
  TitleBarTabs,
  UnderlineTabs,
  type PromptModalVariant,
  type SelectOption,
  type TableColumn,
  type TableKey,
} from '../components/ui';
import './advanced-components-page.css';

type ExampleRow = Readonly<{
  id: string;
  name: string;
  category: string;
  summary: string;
  disabled?: boolean;
}>;

type ModalKind = 'normal' | PromptModalVariant | 'busy' | null;

const rows: readonly ExampleRow[] = [
  { id: 'A-001', name: '示例条目 A', category: '常规', summary: '用于验证单行内容展示。' },
  { id: 'A-002', name: '示例条目 B', category: '说明', summary: '用于验证选择、长文字及第二行辅助内容。' },
  { id: 'A-003', name: '示例条目 C', category: '禁用选择', summary: '该行保留展示，但选择控件不可用。', disabled: true },
];

const columns: readonly TableColumn<ExampleRow>[] = [
  { key: 'id', title: '编号', render: (row) => row.id },
  { key: 'name', title: '名称', render: (row) => row.name },
  { key: 'category', title: '类型', render: (row) => row.category },
  { key: 'summary', title: '说明', render: (row) => row.summary },
];

const multilineColumns: readonly TableColumn<ExampleRow>[] = [
  { key: 'id', title: '编号', render: (row) => row.id },
  {
    key: 'name',
    title: '多行内容',
    multiline: true,
    render: (row) => (
      <>
        <strong>{row.name}</strong>
        <span className="advanced-muted">{row.summary}</span>
      </>
    ),
  },
  { key: 'category', title: '类型', render: (row) => row.category },
];

const selectOptions: readonly SelectOption[] = [
  { value: 'alpha', label: '选项 Alpha' },
  { value: 'beta', label: '选项 Beta' },
  { value: 'gamma', label: '选项 Gamma' },
];

const tabItems = [
  { value: 'overview', label: '概览', panel: '当前显示概览面板。' },
  { value: 'details', label: '详细内容', panel: '当前显示详细内容面板。' },
  { value: 'disabled', label: '禁用项', panel: '不会显示。', disabled: true },
  { value: 'history', label: '更多信息', panel: '当前显示更多信息面板。' },
] as const;

function ReviewSection({
  id,
  page,
  title,
  children,
}: Readonly<{ id: string; page: string; title: string; children: ReactNode }>) {
  return (
    <section id={id} className="advanced-section" aria-labelledby={`${id}-title`}>
      <div className="advanced-section__heading">
        <span>{page}</span>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function GridDemo({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="advanced-grid-demo__item">{children}</div>;
}

export function AdvancedComponentsPage() {
  const modalTriggerRef = useRef<HTMLButtonElement>(null);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [feedback, setFeedback] = useState('尚未操作');
  const [titleTab, setTitleTab] = useState('overview');
  const [underlineTab, setUnderlineTab] = useState('overview');
  const [selectedRows, setSelectedRows] = useState<readonly TableKey[]>(['A-002']);
  const [simplePage, setSimplePage] = useState(1);
  const [complexPage, setComplexPage] = useState(6);
  const [smallPage, setSmallPage] = useState(2);
  const [largePage, setLargePage] = useState(18);
  const [pageSize, setPageSize] = useState(10);
  const [textValue, setTextValue] = useState('');
  const [selectValue, setSelectValue] = useState('alpha');
  const [radioValue, setRadioValue] = useState('one');
  const [checked, setChecked] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function closeModal() {
    setModalKind(null);
  }

  function confirmPrompt(kind: Exclude<ModalKind, 'normal' | 'busy' | null>) {
    setFeedback(`${kind} 提示已确认`);
    closeModal();
  }

  function showBusyModal() {
    setModalKind('busy');
    window.setTimeout(() => {
      setModalKind(null);
      setFeedback('提交中状态已结束');
    }, 900);
  }

  function handleFormSubmit() {
    setSubmitting(true);
    setFeedback('表单已提交');
    window.setTimeout(() => setSubmitting(false), 600);
  }

  const promptKind: PromptModalVariant | null =
    modalKind === 'info' ||
    modalKind === 'warning' ||
    modalKind === 'danger' ||
    modalKind === 'success' ||
    modalKind === 'close'
      ? modalKind
      : null;

  return (
    <div className="advanced-page">
      <header className="advanced-page__intro">
        <div>
          <p>原始 UI 规范 p.13、p.14、p.16–p.18 · 真实公共组件验证</p>
          <span aria-live="polite">交互反馈：{feedback}</span>
        </div>
        <div className="advanced-page__links">
          <Link to="/__dev/components/foundation">基础组件</Link>
          <Link to="/__dev/ui-spec">UI 规范页</Link>
        </div>
      </header>

      <ReviewSection id="advanced-modal" page="p.13" title="Pop-up">
        <div className="advanced-action-row">
          <Button ref={modalTriggerRef} variant="primary" onClick={() => setModalKind('normal')}>普通 Modal</Button>
          <Button onClick={() => setModalKind('info')}>普通提示</Button>
          <Button onClick={() => setModalKind('warning')}>警告提示</Button>
          <Button variant="warning" onClick={() => setModalKind('danger')}>危险提示</Button>
          <Button onClick={() => setModalKind('success')}>成功提示</Button>
          <Button onClick={() => setModalKind('close')}>关闭型提示</Button>
          <Button onClick={showBusyModal}>提交中</Button>
        </div>
        <p className="advanced-muted">支持关闭按钮、Escape、可配置遮罩关闭、焦点限制、焦点返回和页面滚动锁定。</p>
        <Modal
          open={modalKind === 'normal'}
          title="普通弹窗"
          onClose={closeModal}
          returnFocusRef={modalTriggerRef}
          closeOnOverlayClick
          primaryAction={{ label: '确定', onClick: () => { setFeedback('普通弹窗已确认'); closeModal(); } }}
          secondaryAction={{ label: '取消', onClick: closeModal }}
        >
          这是中性的可交互内容区域，用于验证 Header、Content 与 Footer 的结构关系。
        </Modal>
        {promptKind && (
          <PromptModal
            open
            title={promptKind === 'close' ? '关闭型提示' : '操作提示'}
            description="请确认是否继续当前示例操作。"
            variant={promptKind}
            cancelLabel={promptKind === 'close' || promptKind === 'success' ? undefined : '取消'}
            onConfirm={() => confirmPrompt(promptKind)}
            onClose={closeModal}
          />
        )}
        <Modal
          open={modalKind === 'busy'}
          title="正在处理"
          onClose={closeModal}
          busy
          primaryAction={{ label: '确定' }}
        >
          提交中会禁用操作并防止重复触发，结束后自动关闭此验证弹窗。
        </Modal>
      </ReviewSection>

      <ReviewSection id="advanced-tabs" page="p.14" title="Tabs">
        <div className="advanced-demo-grid">
          <div className="advanced-demo-card">
            <span>TitleBarTabs · 手动激活</span>
            <TitleBarTabs aria-label="标题栏标签" items={tabItems} value={titleTab} onValueChange={setTitleTab} />
          </div>
          <div className="advanced-demo-card">
            <span>UnderlineTabs · Hover / Focus / Disabled</span>
            <UnderlineTabs aria-label="下划线标签" items={tabItems} value={underlineTab} onValueChange={setUnderlineTab} />
          </div>
        </div>
      </ReviewSection>

      <ReviewSection id="advanced-grid" page="p.16" title="Grid">
        <div className="advanced-grid-stack">
          <Grid>{[6, 6, 6, 6].map((span, index) => <GridItem key={index} span={span}><GridDemo>6</GridDemo></GridItem>)}</Grid>
          <Grid>{[8, 8, 8].map((span, index) => <GridItem key={index} span={span}><GridDemo>8</GridDemo></GridItem>)}</Grid>
          <Grid><GridItem span={16}><GridDemo>16 主区域</GridDemo></GridItem><GridItem span={8}><GridDemo>8 次区域</GridDemo></GridItem></Grid>
          <Grid align="center"><GridItem span={6}><GridDemo>6</GridDemo></GridItem><GridItem span={12}><GridDemo>12 居中</GridDemo></GridItem><GridItem span={6}><GridDemo>6</GridDemo></GridItem></Grid>
          <Grid>{[6, 6, 6, 6, 6, 6].map((span, index) => <GridItem key={index} span={span}><GridDemo>自动换行 {index + 1}</GridDemo></GridItem>)}</Grid>
        </div>
      </ReviewSection>

      <ReviewSection id="advanced-table" page="p.17" title="Table">
        <div className="advanced-table-stack">
          <Table aria-label="普通表格" columns={columns} rows={rows} getRowKey={(row) => row.id} renderRowActions={(row) => <TextButton onClick={() => setFeedback(`${row.id} 行操作`)}>查看</TextButton>} />
          <Table
            aria-label="多选表格"
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            getRowLabel={(row) => row.name}
            selectable
            selectedKeys={selectedRows}
            onSelectionChange={setSelectedRows}
            isRowSelectionDisabled={(row) => Boolean(row.disabled)}
          />
          <Table aria-label="多行内容表格" columns={multilineColumns} rows={rows} getRowKey={(row) => row.id} />
          <Table aria-label="紧凑表格" columns={columns} rows={rows} getRowKey={(row) => row.id} compact />
          <Table aria-label="空表格" columns={columns} rows={[]} getRowKey={(row) => row.id} empty={<EmptyTable title="暂无示例内容" description="可使用下方操作继续。" action={<Button onClick={() => setFeedback('空表格操作已触发')}>新增示例</Button>} />} />
          <div className="advanced-table-state-grid">
            <Table aria-label="加载表格" columns={columns} rows={[]} getRowKey={(row) => row.id} loading />
            <Table aria-label="错误表格" columns={columns} rows={[]} getRowKey={(row) => row.id} error="加载失败，请重试。" onRetry={() => setFeedback('表格已重试')} />
          </div>
        </div>
      </ReviewSection>

      <ReviewSection id="advanced-pagination" page="p.17" title="Pagination">
        <div className="advanced-pagination-stack">
          <Pagination variant="simple" page={simplePage} totalPages={3} onPageChange={setSimplePage} label="简易分页" />
          <Pagination page={complexPage} totalPages={12} totalItems={90} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setComplexPage} label="复杂分页" />
          <Pagination page={smallPage} totalPages={4} onPageChange={setSmallPage} label="少量页分页" />
          <Pagination page={largePage} totalPages={99} totalItems={990} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setLargePage} label="大量页分页" />
        </div>
      </ReviewSection>

      <ReviewSection id="advanced-form" page="p.18" title="Form">
        <Grid className="advanced-form-layout">
          <GridItem span={20}>
            <Form aria-label="高级组件验证表单" onSubmit={handleFormSubmit}>
              <FormSection id="form-basic" title="基础信息" description="字段布局直接承载上一批公共控件。">
                <Grid>
                  <GridItem span={12}>
                    <FormField label="名称" required help="请输入中性的示例文本。">
                      <Input value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="请输入文本" />
                    </FormField>
                  </GridItem>
                  <GridItem span={12}>
                    <FormField label="选择项" required>
                      <Select options={selectOptions} value={selectValue} onValueChange={setSelectValue} />
                    </FormField>
                  </GridItem>
                  <GridItem span={12}>
                    <FormField label="错误示例" error="请检查当前输入。">
                      <Input defaultValue="需要检查" error />
                    </FormField>
                  </GridItem>
                  <GridItem span={12}>
                    <FormField label="禁用示例" disabled>
                      <Input defaultValue="不可编辑" />
                    </FormField>
                  </GridItem>
                </Grid>
              </FormSection>
              <FormSection id="form-details" title="补充内容" description="Radio、Checkbox 与 Textarea 保持原组件视觉。">
                <FormField label="单选项">
                  <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                    <Radio value="one">选项一</Radio>
                    <Radio value="two">选项二</Radio>
                  </RadioGroup>
                </FormField>
                <FormField label="确认项">
                  <Checkbox checked={checked} onCheckedChange={setChecked}>已阅读说明</Checkbox>
                </FormField>
                <FormField label="说明文字" help="字符统计来自公共 Textarea。">
                  <Textarea maxLength={80} showCount defaultValue="可输入多行说明。" />
                </FormField>
              </FormSection>
              <FormSection id="form-slot" title="布局插槽" description="仅验证上传区域的通用布局，不包含文件选择或上传逻辑。">
                <FormField label="内容区域" width="upload">
                  <div className="advanced-upload-slot" role="group" aria-label="通用内容插槽">通用内容插槽 · 无上传行为</div>
                </FormField>
              </FormSection>
              <FormActions
                submitting={submitting}
                primaryAction={{ label: '提交示例' }}
                secondaryAction={{ label: '取消', onClick: () => setFeedback('表单已取消') }}
              />
            </Form>
          </GridItem>
          <GridItem span={4}>
            <FormAnchorNav items={[
              { id: 'form-basic', label: '基础信息' },
              { id: 'form-details', label: '补充内容' },
              { id: 'form-slot', label: '布局插槽' },
            ]} />
          </GridItem>
        </Grid>
      </ReviewSection>
    </div>
  );
}
