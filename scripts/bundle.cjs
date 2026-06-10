// Bundle extension for VSIX. Marketplace build stubs voice/STT/ws for scanner safety.
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const marketplace = process.env.MARKETPLACE_BUNDLE !== "0";
const stubDir = path.join(__dirname, "..", "src", "marketplace-stubs");

fs.mkdirSync("dist", { recursive: true });

const build = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"],
  sourcemap: false,
  minify: true,
  legalComments: "none",
  target: "node18",
  logLevel: "info",
  define: {
    IS_MARKETPLACE_BUILD: marketplace ? "true" : "false",
  },
};

if (marketplace) {
  build.plugins = [{
    name: "marketplace-stubs",
    setup(b) {
      const stubs = {
        "./voice": path.join(stubDir, "voice.ts"),
        "./voice-recorder": path.join(stubDir, "voice-recorder.ts"),
        "./voice-streamer": path.join(stubDir, "voice-streamer.ts"),
        "./dotenv-reader": path.join(stubDir, "dotenv-reader.ts"),
      };
      b.onResolve({ filter: /^\.\/(voice|dotenv-reader)/ }, (args) => {
        const hit = stubs[args.path];
        if (hit) return { path: hit };
      });
    },
  }];
  console.log("Marketplace bundle: voice/STT/ws stubs enabled");
}

esbuild.build(build).catch((err) => {
  console.error(err);
  process.exit(1);
});