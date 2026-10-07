{
  composer ? null,
  phpWithExtensions ? null,
  pkgs ? import <nixpkgs> {},
}:
with pkgs;
  mkShell rec {
    buildInputs = [
      alejandra
      composer
      nodejs_22
      pnpm
      phpWithExtensions
    ];

    shellHook = ''
      PATH="$PATH:${pkgs.docker-compose}/libexec/docker/cli-plugins"
    '';
  }
