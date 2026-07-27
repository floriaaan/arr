import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { CalendarEntry } from '#domain/calendar/calendar-entry'

export const calendarQuery = defineQuery<CalendarEntry[], [startDate: string, endDate: string]>({
  key: (startDate, endDate) => ['calendar', startDate, endDate],
  queryFn: (connector, startDate, endDate) => connector.getCalendar(startDate, endDate),
})

export function useCalendar(startDate: string, endDate: string) {
  return useDomainQuery(calendarQuery, [startDate, endDate])
}
