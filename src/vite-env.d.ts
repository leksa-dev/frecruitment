/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the grader Worker's /grade endpoint; empty = self-assessment only. */
  readonly VITE_GRADER_URL?: string;
}
