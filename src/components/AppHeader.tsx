// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { useSignal } from "@preact/signals";
import { RelaySettings } from "./RelaySettings";

export function AppHeader() {
  const isOpen = useSignal(false);
  const offcanvasId = "relay-settings-offcanvas";

  return (
    <header class="navbar navbar-light bg-primary border-bottom">
      <div class="container">
        <a class="navbar-brand fw-bold" href="/">
          OpenSlots
        </a>
        <button
          type="button"
          class="navbar-toggler"
          aria-controls={offcanvasId}
          aria-expanded={isOpen.value}
          aria-label="Toggle settings"
          onClick={() => {
            isOpen.value = true;
          }}
        >
          <span class="navbar-toggler-icon" />
        </button>
      </div>

      {isOpen.value ? (
        <button
          type="button"
          class="offcanvas-backdrop fade show"
          aria-label="Close settings"
          onClick={() => {
            isOpen.value = false;
          }}
        />
      ) : null}

      <div
        id={offcanvasId}
        class={`offcanvas offcanvas-end${isOpen.value ? " show" : ""}`}
        style={isOpen.value ? "visibility: visible;" : "visibility: hidden;"}
        aria-labelledby={`${offcanvasId}-label`}
        aria-hidden={!isOpen.value}
        role="dialog"
        tabIndex={-1}
      >
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id={`${offcanvasId}-label`}>
            Settings
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onClick={() => {
              isOpen.value = false;
            }}
          />
        </div>
        <div class="offcanvas-body">
          <RelaySettings />
        </div>
      </div>
    </header>
  );
}
