import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const generateReviewComment = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryId: z.number(),
      reviewType: z.enum(["approval", "rejection"]),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get the timesheet entry
      const timeEntry = await db.timeEntry.findUnique({
        where: { id: input.timeEntryId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          project: {
            select: {
              name: true,
              client: true,
            },
          },
        },
      });

      if (!timeEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet entry not found",
        });
      }

      // Verify that the authenticated user is the manager
      if (timeEntry.user.managerId !== parsed.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to review this timesheet",
        });
      }

      let prompt = `You are a professional manager providing feedback on a timesheet entry.

Employee: ${timeEntry.user.firstName} ${timeEntry.user.lastName}
Project: ${timeEntry.project.name}${timeEntry.project.client ? ` (${timeEntry.project.client})` : ""}
Task: ${timeEntry.task}
${timeEntry.description ? `Description: ${timeEntry.description}` : ""}
Hours: ${timeEntry.hours}
Date: ${new Date(timeEntry.date).toLocaleDateString()}

`;

      if (input.reviewType === "approval") {
        prompt += `Generate a brief, encouraging approval comment (1-2 sentences) acknowledging the work. Be professional and positive.`;
      } else {
        prompt += `The manager wants to reject this timesheet entry.${input.reason ? ` Reason: ${input.reason}` : ""}

Generate a brief, constructive rejection comment (2-3 sentences) that is professional and helpful. Explain what needs to be corrected without being harsh.`;
      }

      prompt += `\n\nOnly return the comment text, nothing else.`;

      const model = openai("gpt-4o-mini");

      const { text } = await generateText({
        model,
        prompt,
      });

      return {
        comment: text.trim(),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("AI review comment error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate review comment",
      });
    }
  });
