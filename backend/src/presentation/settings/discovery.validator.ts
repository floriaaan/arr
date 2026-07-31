import vine from '@vinejs/vine'

export const discoveryValidator = vine.compile(
  vine.object({
    /** Free-form: `nas.local`, `192.168.1.50:8096` or a pasted URL all work — normalized to a bare host. */
    extraHost: vine.string().optional(),
    scanSubnet: vine.boolean().optional(),
  }),
)
