import { db } from "~/server/db";

type NotificationInput = {
  userId: number;
  title: string;
  message: string;
};

export async function createNotification(input: NotificationInput) {
  // Create database notification
  await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
    },
  });

  // TODO: Send email notification
  // This is a placeholder for future email integration
  // You can integrate with services like SendGrid, AWS SES, etc.
  // Example:
  // await sendEmail({
  //   to: userEmail,
  //   subject: input.title,
  //   body: input.message,
  // });
}
