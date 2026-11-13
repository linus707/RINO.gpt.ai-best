// Cloudflare Workers 진입점.
import { createApp } from "./app.js";
import { createModelCaller } from "./model.js";

const app = createApp({ callModelFor: (env) => createModelCaller(env) });

export default {
  fetch: (request, env) => app.fetch(request, env),
};
