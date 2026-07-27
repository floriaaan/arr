import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { GetCalendar } from '#application/calendar/get-calendar.use-case'
import { toCalendarEntryDto } from './calendar.dto.js'
import { calendarRangeValidator } from './calendar-range.validator.js'

export default class CalendarController {
  async index(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(calendarRangeValidator)

    const library = await app.container.make('catalog.mediaLibrary')
    const signer = await app.container.make('images.refSigner')

    const entries = await new GetCalendar(library).execute({
      start: new Date(payload.start),
      end: new Date(payload.end),
    })
    return ctx.response.json({
      entries: entries.map((entry) => toCalendarEntryDto(entry, signer)),
    })
  }
}
