const cssVar = (name: `--${string}`) => `var(${name})` as const;

export const tokenVars = Object.freeze({
  color: Object.freeze({
    brandGradientStart: cssVar('--color-brand-gradient-start'),
    brandGradientEnd: cssVar('--color-brand-gradient-end'),
    primary: cssVar('--color-primary'),
    success: cssVar('--color-success'),
    warning: cssVar('--color-warning'),
    error: cssVar('--color-error'),
    textTitle: cssVar('--color-text-title'),
    textBody: cssVar('--color-text-body'),
    textSecondary: cssVar('--color-text-secondary'),
    textDisabled: cssVar('--color-text-disabled'),
    borderDefault: cssVar('--color-border-default'),
    borderControl: cssVar('--color-border-control'),
    pageBackground: cssVar('--color-background-page'),
    headerBackground: cssVar('--color-background-header'),
  }),
  typography: Object.freeze({
    family: cssVar('--font-family-base'),
    titleLargeSize: cssVar('--font-size-title-large'),
    titleSize: cssVar('--font-size-title'),
    subtitleSize: cssVar('--font-size-subtitle'),
    bodySize: cssVar('--font-size-body'),
    captionSize: cssVar('--font-size-caption'),
  }),
  radius: Object.freeze({
    control: cssVar('--radius-control'),
    container: cssVar('--radius-container'),
  }),
  layout: Object.freeze({
    navbarHeight: cssVar('--layout-navbar-height'),
    sidebarExpandedWidth: cssVar('--layout-sidebar-expanded-width'),
    sidebarCollapsedWidth: cssVar('--layout-sidebar-collapsed-width'),
    pageHeaderHeight: cssVar('--layout-page-header-height'),
    mainGap: cssVar('--layout-main-gap'),
  }),
  grid: Object.freeze({
    columns: cssVar('--grid-column-count'),
    contentWidth: cssVar('--grid-content-width'),
    margin: cssVar('--grid-margin'),
    gutter: cssVar('--grid-gutter'),
  }),
});

export type TokenVars = typeof tokenVars;
