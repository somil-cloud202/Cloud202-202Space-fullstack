import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getReportingData = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
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
          message: "Only admins can access reporting data",
        });
      }

      // Default to last 90 days if no date range provided
      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Fetch all approved time entries in the date range
      const timeEntries = await db.timeEntry.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: "approved",
        },
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              client: true,
              budgetHours: true,
              status: true,
            },
          },
        },
      });

      // Calculate hours by project
      const projectHours = new Map<number, {
        projectId: number;
        projectName: string;
        client: string;
        totalHours: number;
        billableHours: number;
        budgetHours: number | null;
        utilization: number;
      }>();

      for (const entry of timeEntries) {
        if (!projectHours.has(entry.project.id)) {
          projectHours.set(entry.project.id, {
            projectId: entry.project.id,
            projectName: entry.project.name,
            client: entry.project.client || "N/A",
            totalHours: 0,
            billableHours: 0,
            budgetHours: entry.project.budgetHours,
            utilization: 0,
          });
        }
        const projectData = projectHours.get(entry.project.id)!;
        projectData.totalHours += entry.hours;
        if (entry.isBillable) {
          projectData.billableHours += entry.hours;
        }
      }

      // Calculate utilization percentage
      for (const projectData of projectHours.values()) {
        if (projectData.budgetHours) {
          projectData.utilization = (projectData.totalHours / projectData.budgetHours) * 100;
        }
      }

      // Calculate hours by employee
      const employeeHours = new Map<number, {
        employeeId: string;
        employeeName: string;
        designation: string;
        totalHours: number;
        billableHours: number;
        projectCount: number;
      }>();

      for (const entry of timeEntries) {
        if (!employeeHours.has(entry.user.id)) {
          employeeHours.set(entry.user.id, {
            employeeId: entry.user.employeeId,
            employeeName: `${entry.user.firstName} ${entry.user.lastName}`,
            designation: entry.user.designation || "N/A",
            totalHours: 0,
            billableHours: 0,
            projectCount: 0,
          });
        }
        const empData = employeeHours.get(entry.user.id)!;
        empData.totalHours += entry.hours;
        if (entry.isBillable) {
          empData.billableHours += entry.hours;
        }
      }

      // Count unique projects per employee
      const employeeProjects = new Map<number, Set<number>>();
      for (const entry of timeEntries) {
        if (!employeeProjects.has(entry.user.id)) {
          employeeProjects.set(entry.user.id, new Set());
        }
        employeeProjects.get(entry.user.id)!.add(entry.project.id);
      }
      for (const [userId, projects] of employeeProjects.entries()) {
        if (employeeHours.has(userId)) {
          employeeHours.get(userId)!.projectCount = projects.size;
        }
      }

      // Calculate overtime tracking (hours over 40 per week)
      const weeklyHours = new Map<string, Map<number, number>>();
      
      for (const entry of timeEntries) {
        const entryDate = new Date(entry.date);
        // Get the Monday of the week
        const monday = new Date(entryDate);
        monday.setDate(entryDate.getDate() - entryDate.getDay() + 1);
        const weekKey = monday.toISOString().split("T")[0];
        
        if (!weeklyHours.has(weekKey)) {
          weeklyHours.set(weekKey, new Map());
        }
        const weekData = weeklyHours.get(weekKey)!;
        const currentHours = weekData.get(entry.user.id) || 0;
        weekData.set(entry.user.id, currentHours + entry.hours);
      }

      const overtimeData: Array<{
        weekStart: string;
        employeeId: string;
        employeeName: string;
        totalHours: number;
        overtimeHours: number;
      }> = [];

      for (const [weekKey, employeeWeekHours] of weeklyHours.entries()) {
        for (const [userId, hours] of employeeWeekHours.entries()) {
          if (hours > 40) {
            const employee = Array.from(employeeHours.values()).find(
              (e) => timeEntries.find((te) => te.user.id === userId && e.employeeId === te.user.employeeId)
            );
            if (employee) {
              overtimeData.push({
                weekStart: weekKey,
                employeeId: employee.employeeId,
                employeeName: employee.employeeName,
                totalHours: hours,
                overtimeHours: hours - 40,
              });
            }
          }
        }
      }

      // Calculate weekly trends (last 12 weeks)
      const weeklyTrends: Array<{
        weekStart: string;
        totalHours: number;
        billableHours: number;
      }> = [];

      const sortedWeeks = Array.from(weeklyHours.keys()).sort();
      for (const weekKey of sortedWeeks.slice(-12)) {
        const weekData = weeklyHours.get(weekKey)!;
        let totalHours = 0;
        for (const hours of weekData.values()) {
          totalHours += hours;
        }
        
        // Calculate billable hours for this week
        const billableHours = timeEntries
          .filter((e) => {
            const entryDate = new Date(e.date);
            const monday = new Date(entryDate);
            monday.setDate(entryDate.getDate() - entryDate.getDay() + 1);
            return monday.toISOString().split("T")[0] === weekKey && e.isBillable;
          })
          .reduce((sum, e) => sum + e.hours, 0);

        weeklyTrends.push({
          weekStart: weekKey,
          totalHours,
          billableHours,
        });
      }

      // Calculate overall metrics
      const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
      const totalBillableHours = timeEntries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hours, 0);
      const billablePercentage = totalHours > 0 ? (totalBillableHours / totalHours) * 100 : 0;

      return {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        overview: {
          totalHours,
          billableHours: totalBillableHours,
          nonBillableHours: totalHours - totalBillableHours,
          billablePercentage,
          totalProjects: projectHours.size,
          totalEmployees: employeeHours.size,
          averageHoursPerEmployee: employeeHours.size > 0 ? totalHours / employeeHours.size : 0,
        },
        projectHours: Array.from(projectHours.values()).sort((a, b) => b.totalHours - a.totalHours),
        employeeHours: Array.from(employeeHours.values()).sort((a, b) => b.totalHours - a.totalHours),
        overtimeData: overtimeData.sort((a, b) => b.overtimeHours - a.overtimeHours),
        weeklyTrends,
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
