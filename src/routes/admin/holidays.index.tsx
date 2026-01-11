import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useState } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/admin/holidays/")({
  component: AdminHolidaysPage,
});

function AdminHolidaysPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <AdminHolidaysContent />
      </Layout>
    </ProtectedRoute>
  );
}

type HolidayFormData = {
  name: string;
  date: string;
  isOptional: boolean;
};

function AdminHolidaysContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const holidaysQuery = useQuery(
    trpc.getAllHolidays.queryOptions({
      authToken: token!,
      year: selectedYear,
    })
  );

  const createMutation = useMutation(
    trpc.createHoliday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllHolidays.queryKey(),
        });
        setShowCreateForm(false);
        toast.success("Holiday created successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create holiday");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateHoliday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllHolidays.queryKey(),
        });
        setEditingHoliday(null);
        toast.success("Holiday updated successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update holiday");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteHoliday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllHolidays.queryKey(),
        });
        toast.success("Holiday deleted successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete holiday");
      },
    })
  );

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can access this page.</p>
      </div>
    );
  }

  const handleDelete = (holidayId: number, holidayName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${holidayName}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate({
        authToken: token!,
        holidayId,
      });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateForInput = (date: string | Date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Holiday Management</h1>
            <p className="text-blue-100 mt-1 text-lg">
              Manage public holidays that all employees can see
            </p>
          </div>
        </div>
      </div>

      {/* Year Selector and Add Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
            Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 1 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </button>
      </div>

      {/* Create Holiday Form */}
      {showCreateForm && (
        <CreateHolidayForm
          onSubmit={(data) => {
            createMutation.mutate({
              authToken: token!,
              ...data,
              date: new Date(data.date).toISOString(),
            });
          }}
          onCancel={() => setShowCreateForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Holiday Form */}
      {editingHoliday && (
        <EditHolidayForm
          holiday={editingHoliday}
          onSubmit={(data) => {
            updateMutation.mutate({
              authToken: token!,
              holidayId: editingHoliday.id,
              ...data,
              date: new Date(data.date).toISOString(),
            });
          }}
          onCancel={() => setEditingHoliday(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Holidays List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Holidays for {selectedYear}
          </h2>
        </div>

        {holidaysQuery.isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : holidaysQuery.error ? (
          <div className="p-6 text-center text-red-600">
            Error loading holidays: {holidaysQuery.error.message}
          </div>
        ) : !holidaysQuery.data?.holidays.length ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No holidays found for {selectedYear}</p>
            <p className="text-sm">Click "Add Holiday" to create the first one.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {holidaysQuery.data.holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="p-6 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{holiday.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(holiday.date)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {holiday.isOptional ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <XCircle className="w-3 h-3" />
                          Optional
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Public Holiday
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingHoliday(holiday)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(holiday.id, holiday.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateHolidayForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: HolidayFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HolidayFormData>();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Holiday</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Holiday Name
          </label>
          <input
            type="text"
            {...register("name", { required: "Holiday name is required" })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., New Year's Day"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            {...register("date", { required: "Date is required" })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            {...register("isOptional")}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Optional Holiday (employees can choose to observe)
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Holiday"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function EditHolidayForm({
  holiday,
  onSubmit,
  onCancel,
  isLoading,
}: {
  holiday: any;
  onSubmit: (data: HolidayFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HolidayFormData>({
    defaultValues: {
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split("T")[0],
      isOptional: holiday.isOptional,
    },
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Holiday</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Holiday Name
          </label>
          <input
            type="text"
            {...register("name", { required: "Holiday name is required" })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            {...register("date", { required: "Date is required" })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            {...register("isOptional")}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Optional Holiday (employees can choose to observe)
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Updating..." : "Update Holiday"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
