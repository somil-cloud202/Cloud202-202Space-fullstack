import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  File,
  Folder,
  Upload,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

export const Route = createFileRoute("/documents/")({
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <DocumentsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function DocumentsContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<"payslips" | "company" | "personal">("payslips");
  const [uploading, setUploading] = useState(false);

  const payslipsQuery = useQuery(
    trpc.getPayslips.queryOptions({
      authToken: token!,
    })
  );

  const companyDocsQuery = useQuery(
    trpc.getDocuments.queryOptions({
      authToken: token!,
      documentType: "company",
    })
  );

  const personalDocsQuery = useQuery(
    trpc.getDocuments.queryOptions({
      authToken: token!,
      documentType: "personal",
    })
  );

  const createDocumentMutation = useMutation(
    trpc.createDocument.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getDocuments.queryKey(),
        });
      },
    })
  );

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);

      // Get presigned upload URL
      const uploadUrlData = await queryClient.fetchQuery(
        trpc.getDocumentUploadUrl.queryOptions({
          authToken: token!,
          fileName: file.name,
          fileType: file.type,
          documentType: "personal",
        })
      );

      // Upload file to MinIO
      const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Record document in database
      await createDocumentMutation.mutateAsync({
        authToken: token!,
        name: file.name,
        fileUrl: uploadUrlData.objectName,
        documentType: "personal",
      });

      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (bucket: string, objectName: string, fileName: string) => {
    try {
      const downloadUrlData = await queryClient.fetchQuery(
        trpc.getDownloadUrl.queryOptions({
          authToken: token!,
          bucket,
          objectName,
        })
      );

      // Open download URL in new tab
      window.open(downloadUrlData.downloadUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const payslips = payslipsQuery.data?.payslips || [];
  const companyDocs = companyDocsQuery.data?.documents || [];
  const personalDocs = personalDocsQuery.data?.documents || [];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
        <p className="text-gray-600 mt-1">
          Access your payslips, company documents, and personal files
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("payslips")}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "payslips"
                ? "bg-gray-950 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Payslips
          </button>
          <button
            onClick={() => setActiveTab("company")}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "company"
                ? "bg-gray-950 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Company Documents
          </button>
          <button
            onClick={() => setActiveTab("personal")}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "personal"
                ? "bg-gray-950 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Personal Documents
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "payslips" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Monthly Payslips</h2>
            <div className="text-sm text-gray-500">
              {payslips.length} payslips available
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {payslipsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : payslips.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No payslips available yet
              </div>
            ) : (
              payslips.map((payslip) => (
                <div
                  key={payslip.id}
                  className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-800" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Payslip - {monthNames[payslip.month - 1]} {payslip.year}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Generated on {new Date(payslip.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload("payslips", payslip.fileUrl, `payslip-${payslip.month}-${payslip.year}.pdf`)}
                      className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "company" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Company Documents</h2>
            <div className="text-sm text-gray-500">
              {companyDocs.length} documents available
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {companyDocsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : companyDocs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No company documents available yet
              </div>
            ) : (
              companyDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Folder className="w-6 h-6 text-gray-800" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Updated {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload("documents", doc.fileUrl, doc.name)}
                      className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "personal" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Personal Documents</h2>
              <label className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Document"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </label>
            </div>
            <div className="divide-y divide-gray-200">
              {personalDocsQuery.isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : personalDocs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No personal documents uploaded yet
                </div>
              ) : (
                personalDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <File className="w-6 h-6 text-gray-800" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{doc.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload("documents", doc.fileUrl, doc.name)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-100 border border-gray-300 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Document Upload Guidelines
            </h3>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>• Maximum file size: 10 MB</li>
              <li>• Accepted formats: PDF, JPG, PNG</li>
              <li>• Ensure documents are clear and readable</li>
              <li>• Keep sensitive information secure</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
