import { createMockConfig } from './test-utils/mockConfig'
import { WarpBuilder } from './WarpBuilder'

const Config = createMockConfig()
const originalFetch = global.fetch

describe('WarpBuilder', () => {
  beforeEach(() => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ type: 'object' }),
    } as any)
  })
  afterEach(() => {
    ;(global as any).fetch = originalFetch
  })

  it('creates a warp', async () => {
    const warp = await new WarpBuilder(Config)
      .setName('testname')
      .setTitle('test title')
      .setDescription('test description')
      .setPreview('test preview')
      .addAction({
        type: 'link',
        label: 'test link',
        url: 'https://test.com',
        primary: true,
      })
      .build()

    expect(warp.name).toBe('testname')
    expect(warp.title).toBe('test title')
    expect(warp.description).toBe('test description')
    expect(warp.preview).toBe('test preview')
    expect(warp.actions).toEqual([{ type: 'link', label: 'test link', url: 'https://test.com', primary: true }])
  })

  it('getDescriptionPreview - strips all html', () => {
    const preview = new WarpBuilder(Config).getDescriptionPreview('<p>test<br />preview description</p>')
    expect(preview).toBe('test preview description')
  })
})
