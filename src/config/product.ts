export type ProductConfig = Readonly<{
  displayName: string;
  logoSrc?: string;
}>;

const WORKING_PRODUCT_NAME = '算力资源服务平台';

const configuredDisplayName = import.meta.env.VITE_PRODUCT_DISPLAY_NAME?.trim();
const configuredLogoSrc = import.meta.env.VITE_PRODUCT_LOGO_SRC?.trim();

// This is a replaceable working identity, not the confirmed product brand.
export const productConfig: ProductConfig = Object.freeze({
  displayName: configuredDisplayName || WORKING_PRODUCT_NAME,
  ...(configuredLogoSrc ? { logoSrc: configuredLogoSrc } : {}),
});
