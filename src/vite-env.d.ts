/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: string;
  readonly VITE_PRODUCT_DISPLAY_NAME?: string;
  readonly VITE_PRODUCT_LOGO_SRC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
