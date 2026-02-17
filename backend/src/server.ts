import { app } from "./app";
import { env } from "./config/env";
import { initializeStore } from "./store/store";

const init = initializeStore();

app.listen(env.port, () => {
  console.log(`Found backend API listening on http://localhost:${env.port} (state: ${init.source})`);
});
