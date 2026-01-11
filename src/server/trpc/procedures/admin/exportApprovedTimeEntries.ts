import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const exportApprovedTimeEntries = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      userId: z.number().optional(),
      projectId: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      // Verify user is admin
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!user || user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can export time entries",
        });
      }

      // Build where clause - only approved entries
      const where: any = {
        status: "approved",
      };
      
      if (input.startDate) {
        where.date = { ...where.date, gte: new Date(input.startDate) };
      }
      if (input.endDate) {
        where.date = { ...where.date, lte: new Date(input.endDate) };
      }
      if (input.userId) {
        where.userId = input.userId;
      }
      if (input.projectId) {
        where.projectId = input.projectId;
      }

      const timeEntries = await db.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              employeeId: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          project: {
            select: {
              name: true,
              client: true,
            },
          },
        },
        orderBy: [
          { date: "asc" },
          { user: { employeeId: "asc" } },
        ],
      });

      // Generate CSV
      const headers = [
        "Employee ID",
        "Employee Name",
        "Designation",
        "Date",
        "Project",
        "Client",
        "Task",
        "Hours",
        "Billable",
        "Description",
        "Reviewed At",
      ];

      const rows = timeEntries.map((entry) => {
        return [
          entry.user.employeeId,
          `${entry.user.firstName} ${entry.user.lastName}`,
          entry.user.designation || "",
          new Date(entry.date).toLocaleDateString("en-US"),
          entry.project.name,
          entry.project.client || "",
          entry.task,
          entry.hours.toString(),
          entry.isBillable ? "Yes" : "No",
          entry.description || "",
          entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString("en-US") : "",
        ];
      });

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCsvValue = (value: string): string => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCsvValue).join(","),
        ...rows.map((row) => row.map(escapeCsvValue).join(",")),
      ].join("\n");

      return {
        csv: csvContent,
        filename: `approved_timesheets_${new Date().toISOString().split("T")[0]}.csv`,
        count: timeEntries.length,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
