"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateAIInsights = async (industry) => {
  const prompt = `
You are a professional AI career analyst. Analyze the current state of the "${industry}" industry specifically in **Germany**, focusing on opportunities for:

- Tech professionals
- Recent university graduates
- Skilled immigrants

Provide insights in the **exact JSON format** below, without any extra text, explanations, or markdown. All salaries must be in **EUR (€)** and relevant to **major German cities** (Berlin, Munich, Hamburg).

Return only this JSON structure:
{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
  ],
  "growthRate": number, // as a percentage (e.g. 4.5)
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["string"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["string"],
  "recommendedSkills": ["string"]
}

Strict instructions:
- Return only valid JSON.
- Include at least 5 roles in "salaryRanges" relevant to Germany.
- "location" should be one of: "Berlin", "Munich", or "Hamburg".
- Use current and projected hiring trends (2023–2025).
- Focus on roles relevant to digital, IT, and data-driven segments where possible.
- "topSkills" and "recommendedSkills" should be based on the most in-demand technologies in the German job market.
- Use data-backed or widely accepted assumptions, especially for salary and demand levels.
- Never include markdown, code blocks, or commentary — only the pure JSON response.
`;


  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  return JSON.parse(cleanedText);
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}
