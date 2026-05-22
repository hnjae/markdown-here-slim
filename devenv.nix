# SPDX-FileCopyrightText: 2026 KIM Hyunjae
# SPDX-License-Identifier: AGPL-3.0-or-later

{
  config,
  lib,
  pkgs,
  ...
}:
{
  treefmt = {
    enable = true;
    config = {
      settings.excludes = [ "*.lock" ];

      programs = {
        # Other formatter:
        just.enable = true;
        nixfmt.enable = true;
        rumdl-format.enable = true;
        taplo.enable = true;
        yamlfmt.enable = true;
      };
    };
  };

  git-hooks = {
    package = pkgs.prek;
    excludes = [ ".*\\.lock$" ];

    hooks = {
      detect-private-keys.enable = true;
      cocogitto = {
        enable = true;
        name = "cog verify";
        description = "Lint commit messages with Cocogitto.";
        package = pkgs.cocogitto;
        entry = "${lib.getExe pkgs.cocogitto} verify --file";
        stages = [ "commit-msg" ];
      };
      reuse.enable = true;
      typos.enable = true;

      # Check format:
      treefmt.enable = true;

      # Miscellaneous Checkers/Linters:
      deadnix.enable = true;
      statix.enable = true;
      rumdl.enable = true;
    };
  };

  tasks = {
    "ci:check" = { };

    "ci:git-hooks" = {
      exec = "${lib.getExe config.git-hooks.package} run --all-files";
      after = [ "devenv:files" ];
      before = [ "ci:check" ];
    };
  };
}
