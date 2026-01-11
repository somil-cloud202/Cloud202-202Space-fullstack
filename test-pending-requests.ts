import { db } from "./src/server/db";

async function testPendingLeaveRequests() {
  console.log("Testing getPendingLeaveRequests for admin/manager view...");

  // Test for admin user (ID: 1)
  const adminUserId = 1;

  // Get admin user
  const admin = await db.user.findUnique({
    where: { id: adminUserId },
  });

  console.log(`Admin user: ${admin?.firstName} ${admin?.lastName} (${admin?.role})`);

  // Test admin query (should see all pending requests)
  if (admin?.role === "admin") {
    const adminLeaveRequests = await db.leaveRequest.findMany({
      where: {
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            isPaid: true,
          },
        },
        backupUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`\n✅ Admin can see ${adminLeaveRequests.length} pending leave requests:`);

    adminLeaveRequests.forEach((request, index) => {
      console.log(`${index + 1}. ${request.user.firstName} ${request.user.lastName} (${request.user.employeeId})`);
      console.log(`   Leave: ${request.leaveType.name} - ${request.startDate.toLocaleDateString()}`);
      console.log(`   Backup: ${request.backupUser ? `${request.backupUser.firstName} ${request.backupUser.lastName}` : 'None'}`);
    });
  }

  // Test manager query (should see requests from direct reports)
  const managerUserId = 1; // Admin is also manager for somil gupta

  const managerLeaveRequests = await db.leaveRequest.findMany({
    where: {
      status: "pending",
      user: {
        managerId: managerUserId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
        },
      },
      leaveType: {
        select: {
          id: true,
          name: true,
          isPaid: true,
        },
      },
      backupUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`\n✅ Manager can see ${managerLeaveRequests.length} pending leave requests from direct reports:`);

  managerLeaveRequests.forEach((request, index) => {
    console.log(`${index + 1}. ${request.user.firstName} ${request.user.lastName} (${request.user.employeeId})`);
    console.log(`   Leave: ${request.leaveType.name} - ${request.startDate.toLocaleDateString()}`);
    console.log(`   Backup: ${request.backupUser ? `${request.backupUser.firstName} ${request.backupUser.lastName}` : 'None'}`);
  });
}

testPendingLeaveRequests()
  .then(() => {
    console.log("\nTest completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
