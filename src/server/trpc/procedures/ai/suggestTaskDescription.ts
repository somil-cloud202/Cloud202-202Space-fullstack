import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const suggestTaskDescription = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      projectId: z.number(),
      taskTitle: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get project details
      const project = await db.project.findUnique({
        where: { id: input.projectId },
        select: {
          name: true,
          description: true,
          client: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Get recent time entries for context
      const recentEntries = await db.timeEntry.findMany({
        where: {
          userId: parsed.userId,
          projectId: input.projectId,
        },
        orderBy: {
          date: "desc",
        },
        take: 5,
        select: {
          task: true,
          description: true,
        },
      });

      // Build context for AI
      let prompt = `You are helping an employee write a task description for their timesheet entry.

Project: ${project.name}${project.client ? ` (Client: ${project.client})` : ""}
${project.description ? `Project Description: ${project.description}` : ""}
${input.taskTitle ? `Task Title: ${input.taskTitle}` : ""}

`;

      if (recentEntries.length > 0) {
        prompt += `\nRecent tasks the employee has worked on for this project:\n`;
        recentEntries.forEach((entry, idx) => {
          prompt += `${idx + 1}. ${entry.task}${entry.description ? ` - ${entry.description}` : ""}\n`;
        });
      }

      prompt += `\nGenerate a concise, professional task description (1-2 sentences) that the employee could use for their timesheet. Make it specific and action-oriented. Only return the description text, nothing else.`;

      const model = openai("gpt-4o-mini");

      const { text } = await generateText({
        model,
        prompt,
      });

      return {
        suggestion: text.trim(),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("AI suggestion error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate suggestion",
      });
    }
  });
