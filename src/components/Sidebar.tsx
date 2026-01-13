import type { ComponentChildren } from "preact";

export function Sidebar(props: { title: string; children: ComponentChildren }) {
  return (
    <aside class="w-full lg:w-72 bg-paper border border-ink/20 rounded-xl p-4 space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-ink/70">
        {props.title}
      </h2>
      <div class="space-y-3 text-sm text-ink/80">{props.children}</div>
    </aside>
  );
}
