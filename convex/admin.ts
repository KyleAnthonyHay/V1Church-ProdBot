import { query } from "./_generated/server";

export const config = query({
  args: {},
  handler: async () => ({ aiConfigured: Boolean(process.env.OPENAI_API_KEY) }),
});
