import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

export const generateDashboardInsights = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get user to check their role
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
        select: { role: true, firstName: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let prompt: string;

      if (user.role === "admin") {
        // Admin insights: organization-wide data
        const allTimeEntries = await db.timeEntry.findMany({
          where: {
            date: {
              gte: thirtyDaysAgo,
            },
          },
          include: {
            project: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        const totalHours = allTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const approvedHours = allTimeEntries
          .filter((e) => e.status === "approved")
          .reduce((sum, entry) => sum + entry.hours, 0);
        const pendingHours = allTimeEntries
          .filter((e) => e.status === "submitted")
          .reduce((sum, entry) => sum + entry.hours, 0);
        const rejectedCount = allTimeEntries.filter((e) => e.status === "rejected").length;

        // Project distribution
        const projectHours = allTimeEntries.reduce(
          (acc, entry) => {
            const projectName = entry.project.name;
            acc[projectName] = (acc[projectName] || 0) + entry.hours;
            return acc;
          },
          {} as Record<string, number>
        );

        // Employee activity
        const employeeHours = allTimeEntries.reduce(
          (acc, entry) => {
            const employeeName = `${entry.user.firstName} ${entry.user.lastName}`;
            acc[employeeName] = (acc[employeeName] || 0) + entry.hours;
            return acc;
          },
          {} as Record<string, number>
        );

        const activeEmployees = Object.keys(employeeHours).length;

        prompt = `Analyze this organization's work patterns over the last 30 days and provide administrative insights:

Total hours logged across organization: ${totalHours}
Approved hours: ${approvedHours}
Pending hours: ${pendingHours}
Rejected entries: ${rejectedCount}
Active employees: ${activeEmployees}

Hours by project:
${Object.entries(projectHours)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([project, hours]) => `- ${project}: ${hours}h`)
  .join("\n")}

Top employees by hours:
${Object.entries(employeeHours)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([employee, hours]) => `- ${employee}: ${hours}h`)
  .join("\n")}

Provide 3-4 actionable insights about organizational productivity, resource allocation, project health, or management recommendations. Focus on trends, potential issues, and opportunities for improvement.`;
      } else {
        // Employee/Manager insights: personal data
        const timeEntries = await db.timeEntry.findMany({
          where: {
            userId: parsed.userId,
            date: {
              gte: thirtyDaysAgo,
            },
          },
          include: {
            project: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        });

        const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const approvedHours = timeEntries
          .filter((e) => e.status === "approved")
          .reduce((sum, entry) => sum + entry.hours, 0);
        const pendingHours = timeEntries
          .filter((e) => e.status === "submitted")
          .reduce((sum, entry) => sum + entry.hours, 0);
        const rejectedCount = timeEntries.filter((e) => e.status === "rejected").length;

        // Project distribution
        const projectHours = timeEntries.reduce(
          (acc, entry) => {
            const projectName = entry.project.name;
            acc[projectName] = (acc[projectName] || 0) + entry.hours;
            return acc;
          },
          {} as Record<string, number>
        );

        prompt = `Analyze this employee's work patterns over the last 30 days and provide insights:

Total hours logged: ${totalHours}
Approved hours: ${approvedHours}
Pending hours: ${pendingHours}
Rejected entries: ${rejectedCount}

Hours by project:
${Object.entries(projectHours)
  .map(([project, hours]) => `- ${project}: ${hours}h`)
  .join("\n")}

Provide 3-4 actionable insights about their work patterns, productivity, or suggestions for improvement. Be encouraging and constructive.`;
      }

      const model = openai("gpt-4o-mini");

      const { object } = await generateObject({
        model,
        schema: z.object({
          insights: z.array(
            z.object({
              title: z.string().describe("Short title for the insight"),
              description: z
                .string()
                .describe("Detailed description of the insight (2-3 sentences)"),
              type: z
                .enum(["positive", "suggestion", "warning"])
                .describe("Type of insight"),
            })
          ),
        }),
        prompt,
      });

      return {
        insights: object.insights,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("AI insights error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate insights",
      });
    }
  });
