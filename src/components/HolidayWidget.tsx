import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Calendar, CalendarDays } from "lucide-react";

export function HolidayWidget() {
  const trpc = useTRPC();
  const token = useAuthStore((state) => state.token);

  const holidaysQuery = useQuery(
    trpc.getHolidays.queryOptions({
      authToken: token!,
    })
  );

  if (holidaysQuery.isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Recent & Upcoming Holidays</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (holidaysQuery.error || !holidaysQuery.data?.holidays.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Recent & Upcoming Holidays</h3>
        </div>
        <div className="text-center text-gray-500 py-4">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No upcoming holidays</p>
        </div>
      </div>
    );
  }

  // Filter to show all holidays for the current year
  const today = new Date();
  const currentYear = today.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  const relevantHolidays = holidaysQuery.data.holidays
    .filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= startOfYear && holidayDate <= endOfYear;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date
    .slice(0, 8); // Show max 8 holidays

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Holidays {new Date().getFullYear()}</h3>
      </div>

      {relevantHolidays.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No holidays found for this year</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relevantHolidays.map((holiday) => {
            const holidayDate = new Date(holiday.date);
            const daysAway = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isPast = holidayDate < today;

            return (
              <div
                key={holiday.id}
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  isPast ? 'opacity-70' : ''
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                  holiday.isOptional
                    ? 'bg-yellow-100 border border-yellow-200'
                    : 'bg-blue-100 border border-blue-200'
                }`}>
                  <div className={`text-xs font-medium ${
                    holiday.isOptional ? 'text-yellow-700' : 'text-blue-700'
                  }`}>
                    {holidayDate.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                  <div className={`text-lg font-bold ${
                    holiday.isOptional ? 'text-yellow-800' : 'text-blue-800'
                  }`}>
                    {holidayDate.getDate()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{holiday.name}</p>
                    {holiday.isOptional && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {holidayDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    {daysAway === 0 && " • Today"}
                    {daysAway === 1 && " • Tomorrow"}
                    {daysAway === -1 && " • Yesterday"}
                    {daysAway > 1 && ` • ${daysAway} days away`}
                    {daysAway < -1 && ` • ${Math.abs(daysAway)} days ago`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
