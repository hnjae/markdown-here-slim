# SPDX-FileCopyrightText: 2026 KIM Hyunjae
# SPDX-License-Identifier: AGPL-3.0-or-later

{
  config,
  lib,
  pkgs,
  ...
}:
let
  biomeSettings = {
    "$schema" = "https://biomejs.dev/schemas/2.4.14/schema.json";

    formatter = {
      indentStyle = "space";
      indentWidth = 2;
    };

    javascript.formatter = {
      indentStyle = "space";
      indentWidth = 2;
    };

    json.formatter = {
      indentStyle = "space";
      indentWidth = 2;
    };

    css.formatter = {
      indentStyle = "space";
      indentWidth = 2;
    };
  };
in
{
  files."biome.json".json = biomeSettings;

  packages = [
    pkgs.unzip
    pkgs.biome
  ];

  languages = {
    javascript = {
      enable = true;
      package = pkgs.nodejs-slim;
      pnpm.enable = true;
      lsp.package = pkgs.typescript-go;
    };
    typescript = {
      enable = true;
      lsp.package = pkgs.typescript-go;
    };

    nix.enable = true;
  };

  treefmt = {
    enable = true;
    config = {
      settings = {
        excludes = [
          "*.lock"
          "pnpm-lock.yaml"
        ];
      };

      programs = {
        biome = {
          enable = true;
          settings = biomeSettings;
        };

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
    excludes = [
      ".*\\.lock$"
      "pnpm-lock\\.yaml"
    ];

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

    "ci:typecheck" = {
      exec = "pnpm run typecheck";
      before = [ "ci:check" ];
    };
  };
}
