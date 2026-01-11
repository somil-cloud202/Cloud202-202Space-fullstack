import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/trpc/main";

// Auth procedures
import { login } from "~/server/trpc/procedures/auth/login";
import { register } from "~/server/trpc/procedures/auth/register";
import { getMe } from "~/server/trpc/procedures/auth/getMe";
import { changePassword } from "~/server/trpc/procedures/auth/changePassword";
import { requestPasswordReset } from "~/server/trpc/procedures/auth/requestPasswordReset";
import { resetPassword } from "~/server/trpc/procedures/auth/resetPassword";

// Profile procedures
import { updateProfile } from "~/server/trpc/procedures/profile/updateProfile";
import { getUploadUrl } from "~/server/trpc/procedures/profile/getUploadUrl";
import { updateProfilePhoto } from "~/server/trpc/procedures/profile/updateProfilePhoto";

// Timesheet procedures
import { createTimeEntry } from "~/server/trpc/procedures/timesheet/createTimeEntry";
import { getTimeEntries } from "~/server/trpc/procedures/timesheet/getTimeEntries";
import { updateTimeEntry } from "~/server/trpc/procedures/timesheet/updateTimeEntry";
import { deleteTimeEntry } from "~/server/trpc/procedures/timesheet/deleteTimeEntry";
import { getProjects } from "~/server/trpc/procedures/timesheet/getProjects";

// Leave procedures
import { getLeaveBalances } from "~/server/trpc/procedures/leaves/getLeaveBalances";
import { createLeaveRequest } from "~/server/trpc/procedures/leaves/createLeaveRequest";
import { getLeaveRequests } from "~/server/trpc/procedures/leaves/getLeaveRequests";
import { getEmployeesForBackup } from "~/server/trpc/procedures/leaves/getEmployeesForBackup";
import { getLeaveTypes } from "~/server/trpc/procedures/leaves/getLeaveTypes";
import { getHolidays } from "~/server/trpc/procedures/leaves/getHolidays";

// Dashboard procedures
import { getDashboardStats } from "~/server/trpc/procedures/dashboard/getDashboardStats";

// Notification procedures
import { getNotifications } from "~/server/trpc/procedures/notifications/getNotifications";
import { getUnreadCount } from "~/server/trpc/procedures/notifications/getUnreadCount";
import { markAsRead } from "~/server/trpc/procedures/notifications/markAsRead";

// Approval procedures
import { getPendingTimesheets } from "~/server/trpc/procedures/approvals/getPendingTimesheets";
import { getPendingLeaveRequests } from "~/server/trpc/procedures/approvals/getPendingLeaveRequests";
import { reviewTimesheet } from "~/server/trpc/procedures/approvals/reviewTimesheet";
import { reviewLeaveRequest } from "~/server/trpc/procedures/approvals/reviewLeaveRequest";

// Document procedures
import { getDocuments } from "~/server/trpc/procedures/documents/getDocuments";
import { getPayslips } from "~/server/trpc/procedures/documents/getPayslips";
import { getDocumentUploadUrl } from "~/server/trpc/procedures/documents/getDocumentUploadUrl";
import { createDocument } from "~/server/trpc/procedures/documents/createDocument";
import { getDownloadUrl } from "~/server/trpc/procedures/documents/getDownloadUrl";

// Common procedures
import { getMinioBaseUrl } from "~/server/trpc/procedures/common/getMinioBaseUrl";

// Admin procedures
import { getDepartments } from "~/server/trpc/procedures/admin/getDepartments";
import { getManagers } from "~/server/trpc/procedures/admin/getManagers";
import { getAllEmployees } from "~/server/trpc/procedures/admin/getAllEmployees";
import { getEmployeeById } from "~/server/trpc/procedures/admin/getEmployeeById";
import { onboardEmployee } from "~/server/trpc/procedures/admin/onboardEmployee";
import { createProject } from "~/server/trpc/procedures/admin/createProject";
import { getProjectSowUploadUrl } from "~/server/trpc/procedures/admin/getProjectSowUploadUrl";
import { assignProjectToEmployee } from "~/server/trpc/procedures/admin/assignProjectToEmployee";
import { updateEmployee } from "~/server/trpc/procedures/admin/updateEmployee";
import { deactivateEmployee } from "~/server/trpc/procedures/admin/deactivateEmployee";
import { deleteEmployee } from "~/server/trpc/procedures/admin/deleteEmployee";
import { getAllProjects } from "~/server/trpc/procedures/admin/getAllProjects";
import { updateProject } from "~/server/trpc/procedures/admin/updateProject";
import { deleteProject } from "~/server/trpc/procedures/admin/deleteProject";
import { getAllTimeEntries } from "~/server/trpc/procedures/admin/getAllTimeEntries";
import { adminUpdateTimeEntry } from "~/server/trpc/procedures/admin/adminUpdateTimeEntry";
import { adminDeleteTimeEntry } from "~/server/trpc/procedures/admin/adminDeleteTimeEntry";
import { bulkReviewTimeEntries } from "~/server/trpc/procedures/admin/bulkReviewTimeEntries";
import { exportApprovedTimeEntries } from "~/server/trpc/procedures/admin/exportApprovedTimeEntries";
import { getReportingData } from "~/server/trpc/procedures/admin/getReportingData";
import { createLeaveType } from "~/server/trpc/procedures/admin/createLeaveType";
import { updateLeaveType } from "~/server/trpc/procedures/admin/updateLeaveType";
import { deleteLeaveType } from "~/server/trpc/procedures/admin/deleteLeaveType";
import { getAllLeaveTypes } from "~/server/trpc/procedures/admin/getAllLeaveTypes";
import { createHoliday } from "~/server/trpc/procedures/admin/createHoliday";
import { updateHoliday } from "~/server/trpc/procedures/admin/updateHoliday";
import { deleteHoliday } from "~/server/trpc/procedures/admin/deleteHoliday";
import { getAllHolidays } from "~/server/trpc/procedures/admin/getAllHolidays";

// Project Management procedures
import { createSprint } from "~/server/trpc/procedures/projectManagement/createSprint";
import { getSprints } from "~/server/trpc/procedures/projectManagement/getSprints";
import { updateSprint } from "~/server/trpc/procedures/projectManagement/updateSprint";
import { createTask } from "~/server/trpc/procedures/projectManagement/createTask";
import { getTasks } from "~/server/trpc/procedures/projectManagement/getTasks";
import { updateTask } from "~/server/trpc/procedures/projectManagement/updateTask";
import { deleteTask } from "~/server/trpc/procedures/projectManagement/deleteTask";
import { getMyProjects } from "~/server/trpc/procedures/projectManagement/getMyProjects";
import { getProjectTasks } from "~/server/trpc/procedures/projectManagement/getProjectTasks";
import { createTaskComment } from "~/server/trpc/procedures/projectManagement/createTaskComment";
import { getTaskComments } from "~/server/trpc/procedures/projectManagement/getTaskComments";

// AI procedures
import { suggestTaskDescription } from "~/server/trpc/procedures/ai/suggestTaskDescription";
import { generateReviewComment } from "~/server/trpc/procedures/ai/generateReviewComment";
import { suggestTaskPriority } from "~/server/trpc/procedures/ai/suggestTaskPriority";
import { generateDashboardInsights } from "~/server/trpc/procedures/ai/generateDashboardInsights";
import { chatAssistant } from "~/server/trpc/procedures/ai/chatAssistant";

export const appRouter = createTRPCRouter({
  // Auth
  login,
  register,
  getMe,
  changePassword,
  requestPasswordReset,
  resetPassword,

  // Profile
  updateProfile,
  getUploadUrl,
  updateProfilePhoto,

  // Timesheet
  createTimeEntry,
  getTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getProjects,

  // Leaves
  getLeaveBalances,
  createLeaveRequest,
  getLeaveRequests,
  getEmployeesForBackup,
  getLeaveTypes,
  getHolidays,

  // Dashboard
  getDashboardStats,

  // Notifications
  getNotifications,
  getUnreadCount,
  markAsRead,

  // Approvals
  getPendingTimesheets,
  getPendingLeaveRequests,
  reviewTimesheet,
  reviewLeaveRequest,

  // Documents
  getDocuments,
  getPayslips,
  getDocumentUploadUrl,
  createDocument,
  getDownloadUrl,

  // Common
  getMinioBaseUrl,

  // Admin
  getDepartments,
  getManagers,
  getAllEmployees,
  getEmployeeById,
  onboardEmployee,
  createProject,
  getProjectSowUploadUrl,
  assignProjectToEmployee,
  updateEmployee,
  deactivateEmployee,
  deleteEmployee,
  getAllProjects,
  updateProject,
  deleteProject,
  getAllTimeEntries,
  adminUpdateTimeEntry,
  adminDeleteTimeEntry,
  bulkReviewTimeEntries,
  exportApprovedTimeEntries,
  getReportingData,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getAllLeaveTypes,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getAllHolidays,

  // Project Management
  createSprint,
  getSprints,
  updateSprint,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getMyProjects,
  getProjectTasks,
  createTaskComment,
  getTaskComments,

  // AI
  suggestTaskDescription,
  generateReviewComment,
  suggestTaskPriority,
  generateDashboardInsights,
  chatAssistant,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
