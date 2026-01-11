import { Client as MinioClient } from "minio";
import { S3Client, PutObjectCommand, CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isUsingS3 } from "./env";
import { getBaseUrl } from "./utils/base-url";

// Storage client interface
interface StorageClient {
  presignedPutObject(bucket: string, objectName: string, expiry: number): Promise<string>;
  presignedGetObject(bucket: string, objectName: string, expiry: number): Promise<string>;
  bucketExists(bucket: string): Promise<boolean>;
  makeBucket(bucket: string, region?: string): Promise<void>;
  setBucketPolicy(bucket: string, policy: string): Promise<void>;
  getPublicUrl(bucket: string, objectName: string): string;
}

// MinIO implementation
class MinioStorageClient implements StorageClient {
  private client: MinioClient;
  private baseUrl: string;

  constructor() {
    // Use MINIO_ENDPOINT if available, otherwise fall back to base URL logic
    if (env.MINIO_ENDPOINT) {
      this.baseUrl = `http://${env.MINIO_ENDPOINT}`;
      this.client = new MinioClient({
        endPoint: env.MINIO_ENDPOINT.split(':')[0]!,
        port: parseInt(env.MINIO_ENDPOINT.split(':')[1]!) || 9000,
        useSSL: false,
        accessKey: "admin",
        secretKey: env.ADMIN_PASSWORD!,
      });
    } else {
      this.baseUrl = getBaseUrl({ port: 9000 });
      this.client = new MinioClient({
        endPoint: this.baseUrl.split("://")[1]!.split(':')[0]!,
        port: parseInt(this.baseUrl.split("://")[1]!.split(':')[1]!) || 9000,
        useSSL: this.baseUrl.startsWith("https://"),
        accessKey: "admin",
        secretKey: env.ADMIN_PASSWORD!,
      });
    }
  }

  async presignedPutObject(bucket: string, objectName: string, expiry: number): Promise<string> {
    return await this.client.presignedPutObject(bucket, objectName, expiry);
  }

  async presignedGetObject(bucket: string, objectName: string, expiry: number): Promise<string> {
    return await this.client.presignedGetObject(bucket, objectName, expiry);
  }

  async bucketExists(bucket: string): Promise<boolean> {
    return await this.client.bucketExists(bucket);
  }

  async makeBucket(bucket: string, region: string = "us-east-1"): Promise<void> {
    await this.client.makeBucket(bucket, region);
  }

  async setBucketPolicy(bucket: string, policy: string): Promise<void> {
    await this.client.setBucketPolicy(bucket, policy);
  }

  getPublicUrl(bucket: string, objectName: string): string {
    return `${this.baseUrl}/${bucket}/${objectName}`;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// AWS S3 implementation
class S3StorageClient implements StorageClient {
  private client: S3Client;
  private cloudfrontDomain?: string;

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION || "us-east-1",
    });
    this.cloudfrontDomain = env.AWS_CLOUDFRONT_DOMAIN;
  }

  async presignedPutObject(bucket: string, objectName: string, expiry: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectName,
    });
    return await getSignedUrl(this.client, command, { expiresIn: expiry });
  }

  async presignedGetObject(bucket: string, objectName: string, expiry: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectName,
    });
    return await getSignedUrl(this.client, command, { expiresIn: expiry });
  }

  async bucketExists(bucket: string): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch (error) {
      return false;
    }
  }

  async makeBucket(bucket: string, region?: string): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error: any) {
      // Ignore if bucket already exists
      if (error.name !== "BucketAlreadyOwnedByYou" && error.name !== "BucketAlreadyExists") {
        throw error;
      }
    }
  }

  async setBucketPolicy(bucket: string, policy: string): Promise<void> {
    await this.client.send(new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: policy,
    }));
  }

  getPublicUrl(bucket: string, objectName: string): string {
    // Use CloudFront domain if available for profile photos
    if (this.cloudfrontDomain && bucket === this.getBucketName("profile-photos")) {
      return `https://${this.cloudfrontDomain}/${objectName}`;
    }
    // Otherwise use direct S3 URL
    return `https://${bucket}.s3.${env.AWS_REGION || "us-east-1"}.amazonaws.com/${objectName}`;
  }

  getBaseUrl(): string {
    // Return CloudFront domain if available, otherwise S3 endpoint
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}`;
    }
    return `https://s3.${env.AWS_REGION || "us-east-1"}.amazonaws.com`;
  }

  private getBucketName(bucketType: string): string {
    switch (bucketType) {
      case "profile-photos":
        return env.AWS_S3_BUCKET_PROFILE_PHOTOS!;
      case "documents":
        return env.AWS_S3_BUCKET_DOCUMENTS!;
      case "payslips":
        return env.AWS_S3_BUCKET_PAYSLIPS!;
      case "leave-attachments":
        return env.AWS_S3_BUCKET_LEAVE_ATTACHMENTS!;
      default:
        return bucketType;
    }
  }
}

// Export the appropriate client based on environment
export const storageClient: StorageClient = isUsingS3()
  ? new S3StorageClient()
  : new MinioStorageClient();

// Export base URL for backward compatibility
export const minioBaseUrl = isUsingS3()
  ? (new S3StorageClient()).getBaseUrl()
  : (new MinioStorageClient()).getBaseUrl();

// Export legacy minioClient for backward compatibility
export const minioClient = storageClient;

// Helper function to get bucket name (handles both MinIO and S3)
export function getBucketName(bucketType: "profile-photos" | "documents" | "payslips" | "leave-attachments"): string {
  if (isUsingS3()) {
    switch (bucketType) {
      case "profile-photos":
        return env.AWS_S3_BUCKET_PROFILE_PHOTOS!;
      case "documents":
        return env.AWS_S3_BUCKET_DOCUMENTS!;
      case "payslips":
        return env.AWS_S3_BUCKET_PAYSLIPS!;
      case "leave-attachments":
        return env.AWS_S3_BUCKET_LEAVE_ATTACHMENTS!;
    }
  }
  return bucketType;
}
