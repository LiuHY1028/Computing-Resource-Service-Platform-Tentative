import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { productConfig } from '../config/product';
import { tokenVars } from '../theme/tokenVars';
import './ui-spec-page.css';

type TokenName = `--${string}`;

type ColorItem = Readonly<{
  label: string;
  token: TokenName;
}>;

const functionalColors: readonly ColorItem[] = [
  { label: '主色 / 强调色', token: '--color-primary' },
  { label: '成功 / 通过', token: '--color-success' },
  { label: '警告 / 注意', token: '--color-warning' },
  { label: '错误 / 失败', token: '--color-error' },
];

const functionalScales: ReadonlyArray<
  Readonly<{ label: string; colors: readonly ColorItem[] }>
> = [
  {
    label: '主色',
    colors: [
      { label: '背景', token: '--color-primary-background' },
      { label: '获取焦点', token: '--color-primary-focus' },
      { label: '禁用', token: '--color-primary-disabled' },
      { label: '鼠标悬浮', token: '--color-primary-hover' },
      { label: '鼠标按下', token: '--color-primary-active' },
    ],
  },
  {
    label: '成功',
    colors: [
      { label: '背景', token: '--color-success-background' },
      { label: '获取焦点', token: '--color-success-focus' },
      { label: '禁用', token: '--color-success-disabled' },
      { label: '鼠标悬浮', token: '--color-success-hover' },
      { label: '鼠标按下', token: '--color-success-active' },
    ],
  },
  {
    label: '警告',
    colors: [
      { label: '背景', token: '--color-warning-background' },
      { label: '获取焦点', token: '--color-warning-focus' },
      { label: '禁用', token: '--color-warning-disabled' },
      { label: '鼠标悬浮', token: '--color-warning-hover' },
      { label: '鼠标按下', token: '--color-warning-active' },
    ],
  },
  {
    label: '错误',
    colors: [
      { label: '背景', token: '--color-error-background' },
      { label: '获取焦点', token: '--color-error-focus' },
      { label: '禁用', token: '--color-error-disabled' },
      { label: '鼠标悬浮', token: '--color-error-hover' },
      { label: '鼠标按下', token: '--color-error-active' },
    ],
  },
];

const neutralColors: readonly ColorItem[] = [
  { label: '标题', token: '--color-text-title' },
  { label: '正文', token: '--color-text-body' },
  { label: '次要文字', token: '--color-text-secondary' },
  { label: '禁用文字', token: '--color-text-disabled' },
  { label: '通用边框', token: '--color-border-default' },
  { label: '分割线', token: '--color-divider' },
  { label: '页面背景', token: '--color-background-page' },
  { label: '表头背景', token: '--color-background-header' },
];

const typographyRows = [
  {
    label: '大标题',
    sizeLabel: '24 px',
    size: '--font-size-title-large',
    lineHeight: '--line-height-title-large',
  },
  {
    label: '页面 / 区域标题',
    sizeLabel: '20 px',
    size: '--font-size-title',
    lineHeight: '--line-height-title',
  },
  {
    label: '弹窗 / 次级标题',
    sizeLabel: '16 px',
    size: '--font-size-subtitle',
    lineHeight: '--line-height-subtitle',
  },
  {
    label: '正文 / 按钮 / 表格',
    sizeLabel: '14 px',
    size: '--font-size-body',
    lineHeight: '--line-height-body',
  },
  {
    label: '辅助文字 / 紧凑标签',
    sizeLabel: '12 px',
    size: '--font-size-caption',
    lineHeight: '--line-height-caption',
  },
] as const;

const typographyWeightRows = [
  { label: '300', token: '--font-weight-light' },
  { label: '305', token: '--font-weight-action' },
  { label: '330', token: '--font-weight-regular' },
  { label: '380', token: '--font-weight-medium' },
  { label: '480', token: '--font-weight-table-header' },
  { label: 'Demibold', token: '--font-weight-demibold-temporary' },
] as const;

const layoutMetrics = [
  { label: 'Navbar 高度', token: '--layout-navbar-height' },
  { label: 'Navbar 品牌区宽度', token: '--layout-navbar-brand-width' },
  { label: 'Navbar 右侧区域宽度', token: '--layout-navbar-actions-width' },
  { label: 'Sidebar 展开宽度', token: '--layout-sidebar-expanded-width' },
  { label: 'Sidebar 收起宽度', token: '--layout-sidebar-collapsed-width' },
  { label: 'Main Content 外间隙', token: '--layout-main-gap' },
  { label: '页面标题栏高度', token: '--layout-page-header-height' },
  { label: '标题栏水平内边距', token: '--layout-page-header-padding-inline' },
] as const;

const controlMetrics = [
  { page: 'p.9', label: '按钮 / 默认控件高度', token: '--height-control-default' },
  { page: 'p.9', label: '筛选标签高度', token: '--height-control-tag' },
  { page: 'p.9', label: '图标外框', token: '--size-icon-shell' },
  { page: 'p.9', label: '图标内容', token: '--size-icon-inner' },
  { page: 'p.10', label: '文本域默认高度', token: '--height-textarea-default' },
  { page: 'p.11', label: '卡片单选高度', token: '--height-control-radio-card' },
  { page: 'p.13', label: '弹窗头部 / 底部高度', token: '--height-modal-section' },
  { page: 'p.14', label: '标题栏 Tab 操作区', token: '--height-tabs-title-area' },
  { page: 'p.15', label: '长文本 Tooltip 最大宽度', token: '--max-width-tooltip' },
] as const;

const spacingTokens = [
  '--space-4',
  '--space-6',
  '--space-8',
  '--space-12',
  '--space-16',
  '--space-20',
  '--space-40',
] as const;

function CssTokenValue({ name }: { name: TokenName }) {
  return <code>{name}</code>;
}

function ColorSwatch({ item }: { item: ColorItem }) {
  return (
    <div className="ui-spec-swatch">
      <span
        className="ui-spec-swatch__color"
        style={{ '--swatch-color': `var(${item.token})` } as CSSProperties}
        aria-hidden="true"
      />
      <span>{item.label}</span>
      <CssTokenValue name={item.token} />
    </div>
  );
}

function TokenMetric({
  label,
  token,
  prefix,
}: {
  label: string;
  token: TokenName;
  prefix?: string;
}) {
  return (
    <div className="ui-spec-metric">
      <span>{prefix ? `${prefix} · ${label}` : label}</span>
      <CssTokenValue name={token} />
      <span
        className="ui-spec-metric__ruler"
        style={{ '--metric-size': `var(${token})` } as CSSProperties}
        aria-hidden="true"
      />
    </div>
  );
}

function GridColumns() {
  return (
    <div className="ui-spec-grid" aria-label="24 栏栅格示意">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

type FontRuntimeState = Readonly<{
  familyStack: string;
  primaryFamily: string;
  status: string;
}>;

const initialFontRuntimeState: FontRuntimeState = {
  familyStack: '检测中',
  primaryFamily: '检测中',
  status: '检测中',
};

function FontRuntimeStatus() {
  const sampleRef = useRef<HTMLSpanElement>(null);
  const [runtime, setRuntime] = useState(initialFontRuntimeState);

  useEffect(() => {
    const sample = sampleRef.current;

    if (!sample) {
      return;
    }

    const computed = window.getComputedStyle(sample);
    const familyStack = computed.fontFamily;
    const firstFamily = familyStack.split(',')[0]?.trim() ?? '';
    const primaryFamily = firstFamily.replace(/^(["'])(.*)\1$/, '$2');
    const fontSet = document.fonts;

    if (!fontSet || !primaryFamily) {
      setRuntime({
        familyStack,
        primaryFamily: primaryFamily || '无法读取',
        status: '当前浏览器未提供 Font Loading API',
      });
      return;
    }

    let cancelled = false;
    const escapedPrimaryFamily = primaryFamily.replace(/["\\]/g, '\\$&');
    const fontQuery = `${computed.fontWeight} ${computed.fontSize} "${escapedPrimaryFamily}"`;
    const verificationText = '字体排版 Aa 0123，。！？';

    void Promise.all([
      fontSet.load(fontQuery, verificationText),
      fontSet.ready,
    ]).then(() => {
      if (cancelled) {
        return;
      }

      setRuntime({
        familyStack,
        primaryFamily,
        status: fontSet.check(fontQuery, verificationText)
          ? '首选字体已注册并加载'
          : '首选字体未命中，当前使用回退链',
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="ui-spec-font-runtime" aria-label="字体运行时状态">
      <span ref={sampleRef} className="ui-spec-font-runtime__probe" aria-hidden="true">
        字体探针
      </span>
      <dl>
        <div>
          <dt>当前首选字体</dt>
          <dd data-testid="ui-spec-font-primary">{runtime.primaryFamily}</dd>
        </div>
        <div>
          <dt>字体加载状态</dt>
          <dd data-testid="ui-spec-font-status">{runtime.status}</dd>
        </div>
        <div>
          <dt>实际 CSS 回退链</dt>
          <dd>{runtime.familyStack}</dd>
        </div>
      </dl>
      <p>
        回退顺序保留为：首选可变字体、同家族兼容名称、macOS 中文系统字体、Windows
        中文系统字体、宋体兼容与通用无衬线字体。
      </p>
    </div>
  );
}

export function UiSpecPage() {
  return (
    <main className="ui-spec-page">
      <header className="ui-spec-page__header">
        <p>内部路由 · 不属于正式产品菜单</p>
        <h1>UI 规范与 Design Token</h1>
        <p>
          当前展示名称为 {productConfig.displayName}；原规范来源品牌不作为当前产品品牌。
        </p>
        <p>
          原始设计依据：<code>docs/source/03-ui-design-spec.pdf.pdf</code>
        </p>
        <div className="ui-spec-page__links">
          <Link to="/marketplace">返回资源商城</Link>
          <Link to="/__dev/components/foundation">查看基础交互组件</Link>
          <Link to="/__dev/components/advanced">查看高级公共组件</Link>
        </div>
      </header>

      <section className="ui-spec-section" aria-labelledby="brand-boundary-title">
        <div className="ui-spec-section__heading">
          <span>p.1</span>
          <h2 id="brand-boundary-title">Logo 与品牌边界</h2>
        </div>
        <p>
          不复制、不重绘来源 Logo。产品名称与 Logo 继续由集中配置提供；本页集中展示视觉基础。
        </p>
      </section>

      <section className="ui-spec-section" aria-labelledby="color-title">
        <div className="ui-spec-section__heading">
          <span>p.2</span>
          <h2 id="color-title">Color 色彩</h2>
        </div>

        <h3>Brand Colors / 品牌色</h3>
        <div
          className="ui-spec-brand-gradient"
          style={
            {
              '--gradient-start': tokenVars.color.brandGradientStart,
              '--gradient-end': tokenVars.color.brandGradientEnd,
            } as CSSProperties
          }
          aria-label="品牌渐变色示意"
        />
        <div className="ui-spec-inline-values">
          <CssTokenValue name="--color-brand-gradient-start" />
          <CssTokenValue name="--color-brand-gradient-end" />
        </div>

        <h3>Functional / 功能</h3>
        <div className="ui-spec-swatch-grid">
          {functionalColors.map((item) => (
            <ColorSwatch item={item} key={item.token} />
          ))}
        </div>

        <h3>Color card / 色卡</h3>
        <div className="ui-spec-palette-grid">
          {functionalScales.map((scale) => (
            <div className="ui-spec-palette" key={scale.label}>
              <h4>{scale.label}</h4>
              {scale.colors.map((item) => (
                <ColorSwatch item={item} key={item.token} />
              ))}
            </div>
          ))}
        </div>

        <h3>Neutral Colors / 中性色</h3>
        <div className="ui-spec-swatch-grid">
          {neutralColors.map((item) => (
            <ColorSwatch item={item} key={item.token} />
          ))}
        </div>

        <p className="ui-spec-note">
          控件边框与输入错误色按组件专用页拆分为独立 Token，未与 p.2 静默合并。
        </p>
      </section>

      <section className="ui-spec-section" aria-labelledby="typography-title">
        <div className="ui-spec-section__heading">
          <span>p.3</span>
          <h2 id="typography-title">Typography 文字</h2>
        </div>
        <p>本地可变字体已接入；无法加载时仍按 PDF 规定的系统字体链自然回退。</p>
        <FontRuntimeStatus />
        <div
          className="ui-spec-font-glyph-samples"
          data-testid="ui-spec-font-actual-sample"
        >
          <p>
            <span>中文排版</span>
            天地玄黄，宇宙洪荒；资源配置与服务管理。
          </p>
          <p>
            <span>英文排版</span>
            The quick brown fox jumps over the lazy dog.
          </p>
          <p>
            <span>数字与符号</span>
            0123456789 ￥$€ % / + − × = @ # ，。！？「」
          </p>
        </div>
        <h3>字号</h3>
        <div className="ui-spec-type-list">
          {typographyRows.map((row) => (
            <div
              className="ui-spec-type-row"
              key={row.label}
              style={
                {
                  '--type-size': `var(${row.size})`,
                  '--type-line-height': `var(${row.lineHeight})`,
                } as CSSProperties
              }
            >
              <p>天地玄黄，宇宙洪荒。 The quick brown fox jumps over the lazy dog.</p>
              <span>{`${row.sizeLabel} · ${row.label}`}</span>
              <CssTokenValue name={row.size} />
              <CssTokenValue name={row.lineHeight} />
            </div>
          ))}
        </div>
        <h3>连续字重</h3>
        <div className="ui-spec-font-weight-list">
          {typographyWeightRows.map((row) => (
            <div
              className="ui-spec-font-weight-row"
              data-font-weight={row.label}
              key={row.label}
              style={
                {
                  '--type-weight': `var(${row.token})`,
                } as CSSProperties
              }
            >
              <p>字体字重观察 Font weight 012345</p>
              <span>{row.label}</span>
              <CssTokenValue name={row.token} />
            </div>
          ))}
        </div>
      </section>

      <section className="ui-spec-section" aria-labelledby="layout-title">
        <div className="ui-spec-section__heading">
          <span>p.4-p.7</span>
          <h2 id="layout-title">Navbar、Sidebar 与 Main Layout</h2>
        </div>
        <p>下图用于查看尺寸关系，不是正式应用框架组件。</p>
        <div className="ui-spec-layout-demo" aria-label="应用布局尺寸示意">
          <div className="ui-spec-layout-demo__navbar">
            <span>可配置品牌区</span>
            <span>右侧功能区</span>
          </div>
          <div className="ui-spec-layout-demo__sidebar">Sidebar</div>
          <div className="ui-spec-layout-demo__main">
            <div>页面标题栏</div>
            <div>Main Content</div>
          </div>
        </div>
        <div className="ui-spec-metric-grid">
          {layoutMetrics.map((item) => (
            <TokenMetric label={item.label} token={item.token} key={item.token} />
          ))}
        </div>
      </section>

      <section className="ui-spec-section" aria-labelledby="container-title">
        <div className="ui-spec-section__heading">
          <span>p.8</span>
          <h2 id="container-title">Container &amp; Shadow 容器与阴影</h2>
        </div>
        <div className="ui-spec-container-grid">
          <div className="ui-spec-container-sample">常规容器</div>
          <div className="ui-spec-container-sample ui-spec-container-sample--info">信息</div>
          <div className="ui-spec-container-sample ui-spec-container-sample--success">
            成功（采用 p.2 背景临时裁决）
          </div>
          <div className="ui-spec-container-sample ui-spec-container-sample--warning">注意</div>
          <div className="ui-spec-container-sample ui-spec-container-sample--error">错误</div>
        </div>
        <div className="ui-spec-shadow-grid">
          <div className="ui-spec-shadow-sample ui-spec-shadow-sample--button">按钮悬停</div>
          <div className="ui-spec-shadow-sample ui-spec-shadow-sample--dropdown">选择下拉</div>
          <div className="ui-spec-shadow-sample ui-spec-shadow-sample--floating">悬浮</div>
        </div>
      </section>

      <section className="ui-spec-section" aria-labelledby="component-foundations-title">
        <div className="ui-spec-section__heading">
          <span>p.9-p.15</span>
          <h2 id="component-foundations-title">组件基础数值与状态</h2>
        </div>
        <p>
          本页展示基础数值；Button、Input、Select 等公共组件请在基础交互组件页操作。
        </p>
        <div className="ui-spec-metric-grid">
          {controlMetrics.map((item) => (
            <TokenMetric
              label={item.label}
              prefix={item.page}
              token={item.token}
              key={item.token}
            />
          ))}
        </div>
        <h3>间距</h3>
        <div className="ui-spec-spacing-list">
          {spacingTokens.map((token) => (
            <TokenMetric label={token} token={token} key={token} />
          ))}
        </div>
        <h3>Focus</h3>
        <div className="ui-spec-focus-row">
          <button type="button" className="ui-spec-focus-target">
            使用 Tab 聚焦此原生按钮
          </button>
          <span>全局 Focus 为工程可访问性暂定；控件阴影取自 p.10。</span>
        </div>
      </section>

      <section className="ui-spec-section" aria-labelledby="grid-title">
        <div className="ui-spec-section__heading">
          <span>p.16</span>
          <h2 id="grid-title">Grid 栅格</h2>
        </div>
        <div className="ui-spec-inline-values">
          <span>内容宽度</span>
          <CssTokenValue name="--grid-content-width" />
          <span>栏数</span>
          <CssTokenValue name="--grid-column-count" />
          <span>边距 / 栏距</span>
          <CssTokenValue name="--grid-margin" />
        </div>
        <GridColumns />
        <p>常用组合：6 + 6 + 6 + 6、8 + 8 + 8、16 + 8、6 + 12 + 6。</p>
      </section>

      <section className="ui-spec-section" aria-labelledby="composition-title">
        <div className="ui-spec-section__heading">
          <span>p.17-p.18</span>
          <h2 id="composition-title">Table 与 Form 组合基础</h2>
        </div>
        <div className="ui-spec-composition-grid">
          <div>
            <h3>Table</h3>
            <TokenMetric label="单元格水平内边距" token="--table-cell-padding-inline" />
            <TokenMetric label="多行内容垂直留白" token="--table-multiline-padding-block" />
            <TokenMetric label="多行内容间距" token="--table-multiline-gap" />
          </div>
          <div>
            <h3>Form</h3>
            <TokenMetric label="一级分组间距" token="--form-section-gap" />
            <TokenMetric label="字段间距" token="--form-field-gap" />
            <TokenMetric label="标签与控件间距" token="--form-label-gap" />
            <TokenMetric label="上传区域宽度" token="--form-upload-width" />
          </div>
        </div>
        <p className="ui-spec-note">
          表格行高、响应式断点、表单标签宽度等未被 PDF 可靠定义，保留到后续设计确认。
        </p>
      </section>
    </main>
  );
}
