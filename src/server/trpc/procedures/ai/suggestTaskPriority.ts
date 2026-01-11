import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

export const suggestTaskPriority = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      z.object({ userId: z.number() }).parse(verified);

      const model = openai("gpt-4o-mini");

      const prompt = `Analyze this task and suggest a priority level:

Title: ${input.title}
${input.description ? `Description: ${input.description}` : ""}

Consider:
- HIGH priority: Critical bugs, blocking issues, urgent deadlines, security issues
- MEDIUM priority: Important features, moderate impact, standard work items
- LOW priority: Nice-to-haves, minor improvements, non-urgent tasks

What priority level should this task have?`;

      const { object } = await generateObject({
        model,
        output: "enum",
        enum: ["low", "medium", "high"],
        prompt,
      });

      return {
        priority: object as "low" | "medium" | "high",
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("AI priority suggestion error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to suggest priority",
      });
    }
  });
