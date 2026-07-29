import vine from '@vinejs/vine'

/**
 * Deliberately loose: the body is a largely opaque *arr Quality Profile
 * object (cf. QualityProfileRecord) — only the fields this app actually
 * reads are checked, everything else (formatItems, language, nested
 * groups…) passes through untouched.
 */
export const qualityProfilePayloadValidator = vine.compile(
  vine
    .object({
      name: vine.string(),
      upgradeAllowed: vine.boolean(),
      cutoff: vine.number(),
      items: vine.array(vine.any()),
    })
    .allowUnknownProperties(),
)
