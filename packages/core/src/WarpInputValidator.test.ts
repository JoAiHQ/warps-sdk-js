import { WarpInputError, WarpInputValidator } from './WarpInputValidator'

describe('WarpInputValidator', () => {
  const validator = new WarpInputValidator()

  it('reports missing required inputs', () => {
    const errors = validator.validate(
      [
        { name: 'email', type: 'string', required: true },
        { name: 'consent', type: 'boolean', required: true },
        { name: 'note', type: 'string' },
      ],
      { email: '', consent: false }
    )

    expect(errors).toEqual({ email: WarpInputError.Required, consent: WarpInputError.Required })
  })

  it('reads positional inputs and the as key', () => {
    const definitions = [
      { name: 'name', type: 'string', required: true },
      { name: 'mail', as: 'email', type: 'string', required: true },
    ]

    expect(validator.validate(definitions, ['Max', 'max@vleap.at'])).toEqual({})
    expect(validator.validate(definitions, { name: 'Max', email: 'max@vleap.at' })).toEqual({})
  })

  it('decodes serialized warp args before validating', () => {
    const errors = validator.validate(
      [
        { name: 'name', type: 'string', required: true },
        { name: 'agree', type: 'boolean', required: true },
      ],
      ['string:Max', 'bool:true']
    )

    expect(errors).toEqual({})
  })

  it('reports a pattern mismatch', () => {
    const definitions = [{ name: 'zip', type: 'string', pattern: '^[0-9]{4}$' }]

    expect(validator.validate(definitions, { zip: '20200' })).toEqual({ zip: WarpInputError.InvalidFormat })
    expect(validator.validate(definitions, { zip: '2020' })).toEqual({})
  })

  it('reports type mismatches', () => {
    const errors = validator.validate(
      [
        { name: 'text', type: 'textarea' },
        { name: 'count', type: 'uint64' },
        { name: 'flag', type: 'boolean' },
      ],
      { text: ['a'], count: '1.5', flag: 'yes' }
    )

    expect(errors).toEqual({ text: WarpInputError.String, count: WarpInputError.Integer, flag: WarpInputError.Boolean })
  })

  it('skips empty optional inputs', () => {
    expect(validator.validate([{ name: 'zip', type: 'string', pattern: '^[0-9]{4}$' }], {})).toEqual({})
  })
})
