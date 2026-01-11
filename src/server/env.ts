import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  DATABASE_URL: z.string(),
  ADMIN_PASSWORD: z.string().optional(), // Optional for AWS S3 migration
  JWT_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  MINIO_ENDPOINT: z.string().optional(),

  // AWS Configuration (optional, for S3 deployment)
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET_PROFILE_PHOTOS: z.string().optional(),
  AWS_S3_BUCKET_DOCUMENTS: z.string().optional(),
  AWS_S3_BUCKET_PAYSLIPS: z.string().optional(),
  AWS_S3_BUCKET_LEAVE_ATTACHMENTS: z.string().optional(),
  AWS_CLOUDFRONT_DOMAIN: z.string().optional(),
});

export const env = envSchema.parse(process.env);

// Helper to check if using AWS S3 or MinIO
export const isUsingS3 = () => {
  return !!(env.AWS_REGION && env.AWS_S3_BUCKET_PROFILE_PHOTOS);
};
