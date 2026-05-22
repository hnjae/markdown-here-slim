#!/usr/bin/env -S just --justfile
# SPDX-FileCopyrightText: 2026 KIM Hyunjae
# SPDX-License-Identifier: AGPL-3.0-or-later

set unstable
set lazy

_:
    @just --list

[group('ci')]
format:
    devenv shell -- treefmt

[group('ci')]
check:
    devenv tasks run ci:check

[group('build')]
build:
    pnpm run build
