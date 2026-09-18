---
name: Build environment
description: Environment requirements and verification conventions for the AdForge artifact.
---

AdForge's Vite build expects `PORT` and `BASE_PATH` to be supplied by the managed artifact workflow; standalone build checks must provide both values explicitly.

**Why:** The workflow injects these values, but a direct package build fails before Vite loads the config when they are absent.

**How to apply:** Use the managed workflow for normal verification, or provide the workflow-equivalent environment values when running a standalone production build.