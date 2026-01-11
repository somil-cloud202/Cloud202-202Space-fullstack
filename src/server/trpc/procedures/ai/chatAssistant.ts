import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const chatAssistant = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      message: z.string(),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        )
        .optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      z.object({ userId: z.number() }).parse(verified);

      const model = openai("gpt-4o-mini");

      const systemPrompt = `You are a helpful AI assistant for an employee HR portal called "202 Space". You help employees with:

- Understanding how to use the timesheet system
- Applying for leaves and understanding leave policies
- Navigating the project management features
- Understanding their dashboard and statistics
- General work-related questions

Be concise, friendly, and professional. If asked about specific personal data, remind users to check their actual portal pages as you don't have access to their personal information.

Available features in the portal:
- Dashboard: View work statistics and quick actions
- Timesheet: Log work hours for projects
- Leaves: Apply for time off and check balances
- Projects: View assigned projects and manage tasks (Kanban board)
- Documents: Access payslips and company documents
- Profile: Update personal information
- Manager Dashboard (for managers): Approve/reject timesheets and leave requests
- Admin Dashboard (for admins): Manage employees, projects, and assignments`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.conversationHistory || []),
        { role: "user" as const, content: input.message },
      ];

      const { textStream } = await streamText({
        model,
        messages,
      });

      let fullResponse = "";
      for await (const textPart of textStream) {
        fullResponse += textPart;
      }

      return {
        response: fullResponse,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("AI chat error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to process chat message",
      });
    }
  });
