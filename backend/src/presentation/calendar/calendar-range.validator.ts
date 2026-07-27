import vine from '@vinejs/vine'

/** `YYYY-MM-DD` — the bounds of the calendar grid being displayed. */
export const calendarRangeValidator = vine.compile(
  vine.object({
    start: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
)
