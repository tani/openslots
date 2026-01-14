// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import type { ComponentChildren } from "preact";

export function Sidebar(props: { title: string; children: ComponentChildren }) {
  return (
    <aside class="card shadow-sm h-100">
      <div class="card-body">
        <h2
          class="card-title h6 text-uppercase fw-bold text-muted mb-3"
          style="letter-spacing: 0.2em;"
        >
          {props.title}
        </h2>
        <div class="d-grid gap-3 small text-muted">{props.children}</div>
      </div>
    </aside>
  );
}
