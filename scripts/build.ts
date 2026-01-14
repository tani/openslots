// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { buildOnce } from "./shared";

await buildOnce({ minify: true, sourcemap: "none", exitOnError: true });
