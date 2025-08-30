/// <reference types="react" />

declare namespace JSX {
  // Allow using JSX with the automatic runtime
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
