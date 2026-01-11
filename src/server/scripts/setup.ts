import { storageClient, getBucketName } from "~/server/minio";
import { db } from "~/server/db";
import { env, isUsingS3 } from "~/server/env";
import bcryptjs from "bcryptjs";

async function setup() {
  console.log(`Running setup in ${isUsingS3() ? 'AWS S3' : 'MinIO'} mode...`);

  // Create storage buckets (MinIO or S3)
  const bucketTypes: Array<"profile-photos" | "documents" | "payslips" | "leave-attachments"> = [
    "profile-photos",
    "leave-attachments",
    "payslips",
    "documents",
  ];

  for (const bucketType of bucketTypes) {
    const bucketName = getBucketName(bucketType);
    const exists = await storageClient.bucketExists(bucketName);
    
    if (!exists) {
      await storageClient.makeBucket(bucketName, env.AWS_REGION || "us-east-1");
      console.log(`Created bucket: ${bucketName}`);

      // Set public read policy for profile photos
      if (bucketType === "profile-photos") {
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
          ],
        };
        await storageClient.setBucketPolicy(
          bucketName,
          JSON.stringify(policy)
        );
        console.log(`Set public policy for bucket: ${bucketName}`);
      }
    } else {
      console.log(`Bucket already exists: ${bucketName}`);
    }
  }

  // Seed departments
  const departments = [
    { name: "Engineering" },
    { name: "Human Resources" },
    { name: "Sales" },
    { name: "Marketing" },
    { name: "Finance" },
  ];

  for (const dept of departments) {
    await db.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  console.log("Seeded departments");

  // Seed leave types
  const leaveTypes = [
    {
      name: "Annual Leave",
      isPaid: true,
      requiresApproval: true,
      requiresAttachment: false,
      defaultAllocated: 18,
    },
    {
      name: "Sick Leave",
      isPaid: true,
      requiresApproval: true,
      requiresAttachment: true,
      defaultAllocated: 10,
    },
    {
      name: "Personal Leave",
      isPaid: false,
      requiresApproval: true,
      requiresAttachment: false,
      defaultAllocated: 5,
    },
    {
      name: "Comp Off",
      isPaid: true,
      requiresApproval: true,
      requiresAttachment: false,
      defaultAllocated: 0,
    },
  ];

  for (const leaveType of leaveTypes) {
    await db.leaveType.upsert({
      where: { name: leaveType.name },
      update: { defaultAllocated: leaveType.defaultAllocated },
      create: leaveType,
    });
  }
  console.log("Seeded leave types");

  // Seed holidays for current year
  const currentYear = new Date().getFullYear();
  const holidays = [
    { name: "New Year's Day", date: new Date(`${currentYear}-01-01`), year: currentYear },
    { name: "Independence Day", date: new Date(`${currentYear}-07-04`), year: currentYear },
    { name: "Thanksgiving", date: new Date(`${currentYear}-11-28`), year: currentYear },
    { name: "Christmas", date: new Date(`${currentYear}-12-25`), year: currentYear },
  ];

  for (const holiday of holidays) {
    const existing = await db.holiday.findFirst({
      where: {
        name: holiday.name,
        year: holiday.year,
      },
    });
    if (!existing) {
      await db.holiday.create({
        data: holiday,
      });
    }
  }
  console.log("Seeded holidays");

  // Create admin user if not exists
  const adminEmail = "admin@company.com";
  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    // Use ADMIN_PASSWORD from env, with a default for AWS deployments
    const adminPassword = env.ADMIN_PASSWORD || "ChangeMe123!";
    const passwordHash = await bcryptjs.hash(adminPassword, 10);
    const hrDept = await db.department.findUnique({
      where: { name: "Human Resources" },
    });

    await db.user.create({
      data: {
        employeeId: "EMP001",
        email: adminEmail,
        passwordHash,
        role: "admin",
        firstName: "Admin",
        lastName: "User",
        joinDate: new Date(),
        departmentId: hrDept?.id,
        designation: "HR Manager",
        employmentType: "full-time",
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
    console.log(`Admin password: ${adminPassword}`);
  }

  // Create some sample employees
  const engineeringDept = await db.department.findUnique({
    where: { name: "Engineering" },
  });

  // First create the manager
  const managerEmail = "jane.smith@company.com";
  let manager = await db.user.findUnique({
    where: { email: managerEmail },
  });

  if (!manager) {
    const passwordHash = await bcryptjs.hash("password123", 10);
    manager = await db.user.create({
      data: {
        employeeId: "EMP003",
        email: managerEmail,
        passwordHash,
        firstName: "Jane",
        lastName: "Smith",
        role: "manager",
        designation: "Engineering Manager",
        departmentId: engineeringDept?.id,
        joinDate: new Date(),
        employmentType: "full-time",
      },
    });

    // Create leave balances for the manager
    const leaveTypes = await db.leaveType.findMany();
    const currentYear = new Date().getFullYear();
    
    for (const leaveType of leaveTypes) {
      let allocated = 15;
      if (leaveType.name === "Annual Leave") allocated = 18;
      if (leaveType.name === "Sick Leave") allocated = 10;
      if (leaveType.name === "Personal Leave") allocated = 5;
      if (leaveType.name === "Comp Off") allocated = 0;

      await db.leaveBalance.create({
        data: {
          userId: manager.id,
          year: currentYear,
          leaveTypeId: leaveType.id,
          allocated,
          used: 0,
          balance: allocated,
        },
      });
    }
  }

  // Then create the employee reporting to the manager
  const employeeEmail = "john.doe@company.com";
  const existingEmployee = await db.user.findUnique({
    where: { email: employeeEmail },
  });

  if (!existingEmployee) {
    const passwordHash = await bcryptjs.hash("password123", 10);
    const employee = await db.user.create({
      data: {
        employeeId: "EMP004",
        email: employeeEmail,
        passwordHash,
        firstName: "John",
        lastName: "Doe",
        role: "employee",
        designation: "Software Engineer",
        departmentId: engineeringDept?.id,
        managerId: manager.id, // Link to manager
        joinDate: new Date(),
        employmentType: "full-time",
      },
    });

    // Create leave balances for the employee
    const leaveTypes = await db.leaveType.findMany();
    const currentYear = new Date().getFullYear();
    
    for (const leaveType of leaveTypes) {
      let allocated = 15;
      if (leaveType.name === "Annual Leave") allocated = 18;
      if (leaveType.name === "Sick Leave") allocated = 10;
      if (leaveType.name === "Personal Leave") allocated = 5;
      if (leaveType.name === "Comp Off") allocated = 0;

      await db.leaveBalance.create({
        data: {
          userId: employee.id,
          year: currentYear,
          leaveTypeId: leaveType.id,
          allocated,
          used: 0,
          balance: allocated,
        },
      });
    }

    // Assign employee to projects
    const projects = await db.project.findMany();
    for (const project of projects) {
      await db.projectAssignment.create({
        data: {
          userId: employee.id,
          projectId: project.id,
          role: "Developer",
        },
      });
    }
  }

  console.log("Seeded sample employees with manager relationship");

  // Create sample projects
  const projects = [
    {
      name: "Project Alpha",
      client: "Acme Corp",
      description: "Main product development",
      startDate: new Date("2024-01-01"),
      budgetHours: 1000,
      status: "active",
    },
    {
      name: "Project Beta",
      client: "TechStart Inc",
      description: "Mobile app development",
      startDate: new Date("2024-03-01"),
      budgetHours: 500,
      status: "active",
    },
  ];

  for (const project of projects) {
    const existing = await db.project.findFirst({
      where: { name: project.name },
    });
    if (!existing) {
      await db.project.create({
        data: project,
      });
    }
  }
  console.log("Seeded sample projects");
}

setup()
  .then(() => {
    console.log("setup.ts complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
