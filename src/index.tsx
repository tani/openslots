// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { render } from "preact";
import { LocationProvider, Route, Router } from "preact-iso";

import { CreateRoom } from "./pages/CreateRoom";
import { JoinRoom } from "./pages/JoinRoom";

function App() {
  return (
    <LocationProvider>
      <div class="min-vh-100">
        <Router>
          <Route path="/" component={CreateRoom} />
          <Route path="/room/:id" component={JoinRoom} />
        </Router>
      </div>
    </LocationProvider>
  );
}

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}
