import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "dhanmeet", // Unique app ID
  name: "dhanmeet",
  credentials: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
});
