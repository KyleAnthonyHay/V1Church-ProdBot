import { lazy, Suspense, type ComponentProps } from "react";
import type { Streamdown } from "streamdown";
const Markdown = lazy(() =>
  import("./streaming-response").then((m) => ({ default: m.Response })),
);

/** Load markdown rendering only when there is an answer or document to show. */
export function Response(props: ComponentProps<typeof Streamdown>) {
  return (
    <Suspense
      fallback={<div className="whitespace-pre-wrap">{props.children}</div>}
    >
      <Markdown {...props} />
    </Suspense>
  );
}
