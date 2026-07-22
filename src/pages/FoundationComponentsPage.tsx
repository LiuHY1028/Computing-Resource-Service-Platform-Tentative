import { useState, type ReactNode } from 'react';
import {
  Button,
  CardRadio,
  Checkbox,
  CheckboxGroup,
  Container,
  FilterIcon,
  FilterTag,
  IconButton,
  InfoIcon,
  Input,
  MultiSelect,
  Radio,
  RadioGroup,
  SearchIcon,
  SearchInput,
  Select,
  Textarea,
  TextButton,
  Tooltip,
  type ContainerVariant,
  type SelectOption,
} from '../components/ui';
import './foundation-components-page.css';

const containerVariants: ReadonlyArray<
  Readonly<{ value: ContainerVariant; label: string }>
> = [
  { value: 'borderless', label: '无边框' },
  { value: 'default', label: '常规' },
  { value: 'disabled', label: '禁用' },
  { value: 'dashed', label: '虚线' },
  { value: 'danger', label: '错误 / 危险' },
  { value: 'focus', label: '聚焦' },
  { value: 'marked', label: '标记' },
  { value: 'info', label: '信息' },
  { value: 'urgent', label: '紧急' },
  { value: 'success', label: '成功' },
  { value: 'attention', label: '注意' },
];

const selectOptions: readonly SelectOption[] = [
  { value: 'alpha', label: '选项 Alpha' },
  { value: 'beta', label: '选项 Beta' },
  { value: 'gamma', label: '选项 Gamma' },
  { value: 'delta', label: '选项 Delta' },
  { value: 'disabled', label: '禁用选项', disabled: true },
];

function DemoBlock({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="foundation-demo-block">
      <span className="foundation-demo-block__label">{label}</span>
      <div className="foundation-demo-block__content">{children}</div>
    </div>
  );
}

export function FoundationComponentsPage() {
  const [clearableValue, setClearableValue] = useState('可清空内容');
  const [countedValue, setCountedValue] = useState('字符统计');
  const [searchFeedback, setSearchFeedback] = useState('尚未提交');
  const [radioValue, setRadioValue] = useState('one');
  const [cardRadioValue, setCardRadioValue] = useState('plain');
  const [checkboxValues, setCheckboxValues] = useState<readonly string[]>(['one']);
  const [selectValue, setSelectValue] = useState('');
  const [multiValue, setMultiValue] = useState<readonly string[]>([
    'alpha',
    'beta',
    'gamma',
  ]);
  const [buttonFeedback, setButtonFeedback] = useState('尚未操作');
  const [tooltipFeedback, setTooltipFeedback] = useState('尚未操作');

  return (
    <div className="foundation-page">
      <header className="foundation-page__intro">
        <p>原始 UI 规范 p.8–p.12、p.15 · 真实公共组件验证</p>
        <span aria-live="polite">交互反馈：{buttonFeedback}</span>
      </header>

      <section id="foundation-containers" className="foundation-section" aria-labelledby="foundation-containers-title">
        <div className="foundation-section__heading">
          <span>p.8</span>
          <h2 id="foundation-containers-title">Container 与 Shadow</h2>
        </div>
        <div className="foundation-container-grid">
          {containerVariants.map((variant) => (
            <Container key={variant.value} variant={variant.value}>
              {variant.label}
            </Container>
          ))}
        </div>
        <div className="foundation-shadow-row">
          <Container shadow="button-hover">按钮悬停阴影</Container>
          <Container shadow="dropdown">下拉阴影</Container>
          <Container shadow="floating">悬浮阴影</Container>
        </div>
      </section>

      <section id="foundation-buttons" className="foundation-section" aria-labelledby="foundation-buttons-title">
        <div className="foundation-section__heading">
          <span>p.9</span>
          <h2 id="foundation-buttons-title">Button</h2>
        </div>
        <div className="foundation-demo-grid">
          <DemoBlock label="类型与图标">
            <Button variant="primary" onClick={() => setButtonFeedback('主要按钮已触发')}>主要按钮</Button>
            <Button>次要按钮</Button>
            <Button variant="warning">警示按钮</Button>
            <Button variant="danger">危险按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button disabled>禁用按钮</Button>
            <Button leftIcon={<SearchIcon />}>左图标</Button>
            <Button rightIcon={<SearchIcon />}>右图标</Button>
          </DemoBlock>
          <DemoBlock label="文字、图标与筛选">
            <TextButton>文字按钮</TextButton>
            <TextButton icon={<SearchIcon />}>文字图标按钮</TextButton>
            <IconButton aria-label="查看说明" icon={<InfoIcon />} onClick={() => setButtonFeedback('图标按钮已触发')} />
            <IconButton aria-label="悬浮操作" appearance="floating" icon={<SearchIcon />} />
            <FilterTag icon={<FilterIcon />}>含图标筛选</FilterTag>
            <FilterTag defaultSelected>无图标筛选</FilterTag>
          </DemoBlock>
        </div>
      </section>

      <section id="foundation-inputs" className="foundation-section" aria-labelledby="foundation-inputs-title">
        <div className="foundation-section__heading">
          <span>p.10</span>
          <h2 id="foundation-inputs-title">Input 与 Textarea</h2>
        </div>
        <div className="foundation-form-grid">
          <DemoBlock label="基础与已有输入">
            <Input aria-label="基础输入" placeholder="请输入内容" />
            <Input aria-label="已有输入" defaultValue="已输入内容" />
            <Input aria-label="长文本溢出" defaultValue="这是一段用于验证单行输入溢出显示的较长文本内容" />
          </DemoBlock>
          <DemoBlock label="清空、搜索与限长">
            <Input aria-label="可清空输入" clearable value={clearableValue} onChange={(event) => setClearableValue(event.target.value)} />
            <SearchInput aria-label="搜索输入" placeholder="输入后按 Enter" onSearch={(value) => setSearchFeedback(value || '空内容')} />
            <span className="foundation-inline-feedback" aria-live="polite">搜索提交：{searchFeedback}</span>
            <Input aria-label="限长输入" maxLength={20} showCount value={countedValue} onChange={(event) => setCountedValue(event.target.value)} />
          </DemoBlock>
          <DemoBlock label="禁用、只读与错误">
            <Input aria-label="禁用输入" disabled defaultValue="禁用状态" />
            <Input aria-label="只读输入" readOnly defaultValue="只读状态" />
            <Input aria-label="错误输入" error errorMessage="输入内容需要检查" defaultValue="错误状态" />
          </DemoBlock>
          <DemoBlock label="文本域">
            <Textarea aria-label="基础文本域" placeholder="请输入多行内容" />
            <Textarea aria-label="限长文本域" maxLength={60} showCount defaultValue="可拖拽改变高度，并显示字符数量。" />
            <Textarea aria-label="错误文本域" error errorMessage="文本域内容需要检查" defaultValue="错误状态" />
            <Textarea aria-label="禁用文本域" disabled defaultValue="禁用状态" />
          </DemoBlock>
        </div>
      </section>

      <section id="foundation-selection" className="foundation-section" aria-labelledby="foundation-selection-title">
        <div className="foundation-section__heading">
          <span>p.11</span>
          <h2 id="foundation-selection-title">Radio 与 Checkbox</h2>
        </div>
        <div className="foundation-demo-grid">
          <DemoBlock label="Radio 与卡片 Radio">
            <RadioGroup aria-label="基础单选组" value={radioValue} onValueChange={setRadioValue}>
              <Radio value="one">选项一</Radio>
              <Radio value="two">选项二</Radio>
              <Radio value="disabled" disabled>禁用</Radio>
            </RadioGroup>
            <Radio checked disabled value="selected-disabled" onChange={() => undefined}>已选禁用</Radio>
            <RadioGroup aria-label="卡片单选组" direction="vertical" value={cardRadioValue} onValueChange={setCardRadioValue}>
              <CardRadio value="plain" title="卡片单选" />
              <CardRadio value="detail" title="含标题和说明" description="用于验证标题、说明和显式选中标记。" />
            </RadioGroup>
          </DemoBlock>
          <DemoBlock label="Checkbox">
            <CheckboxGroup aria-label="复选组" value={checkboxValues} onValueChange={setCheckboxValues}>
              <Checkbox value="one">选项一</Checkbox>
              <Checkbox value="two">选项二</Checkbox>
            </CheckboxGroup>
            <Checkbox disabled>未选禁用</Checkbox>
            <Checkbox checked disabled onChange={() => undefined}>已选禁用</Checkbox>
            <Checkbox indeterminate>部分选择</Checkbox>
            <Checkbox indeterminate disabled>部分选择禁用</Checkbox>
          </DemoBlock>
        </div>
      </section>

      <section id="foundation-selects" className="foundation-section" aria-labelledby="foundation-selects-title">
        <div className="foundation-section__heading">
          <span>p.12</span>
          <h2 id="foundation-selects-title">Select 与 MultiSelect</h2>
        </div>
        <div className="foundation-form-grid">
          <DemoBlock label="单选选择器">
            <Select aria-label="基础选择器" options={selectOptions} value={selectValue} onValueChange={setSelectValue} />
            <Select aria-label="默认已选择" options={selectOptions} defaultValue="beta" />
            <Select aria-label="禁用选择器" options={selectOptions} disabled placeholder="禁用状态" />
          </DemoBlock>
          <DemoBlock label="多选选择器">
            <MultiSelect aria-label="基础多选选择器" options={selectOptions} value={multiValue} onValueChange={setMultiValue} maxVisibleTags={2} />
            <MultiSelect aria-label="空多选选择器" options={selectOptions} />
            <MultiSelect aria-label="禁用多选选择器" options={selectOptions} defaultValue={['alpha']} disabled />
          </DemoBlock>
        </div>
      </section>

      <section id="foundation-tooltips" className="foundation-section" aria-labelledby="foundation-tooltips-title">
        <div className="foundation-section__heading">
          <span>p.15</span>
          <h2 id="foundation-tooltips-title">Tooltip</h2>
        </div>
        <div className="foundation-tooltip-row">
          <Tooltip content="基础文字提示">
            <Button>基础提示</Button>
          </Tooltip>
          <Tooltip content="这是一段较长的提示文字，用于验证最大宽度、自动换行与视口边界处理。">
            <Button>长文字提示</Button>
          </Tooltip>
          <Tooltip title="提示标题" content="标题下方展示正文内容。">
            <Button>标题加正文</Button>
          </Tooltip>
          <Tooltip content={<span>正文内可执行 <button type="button" onClick={() => setTooltipFeedback('正文操作已触发')}>文字操作</button></span>}>
            <Button>正文操作</Button>
          </Tooltip>
          <Tooltip content="提示正文" action={<button type="button" onClick={() => setTooltipFeedback('独立操作已触发')}>独立操作</button>}>
            <Button>独立操作</Button>
          </Tooltip>
          <span className="foundation-inline-feedback" aria-live="polite">{tooltipFeedback}</span>
        </div>
      </section>
    </div>
  );
}
