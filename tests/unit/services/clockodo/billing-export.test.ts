import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import {
  createBexioBillingExport,
  parseBexioBillingMapping,
} from '../../../../src/services/clockodo/billing-export.js'
import {
  EntryGroupsService,
  flattenEntryGroupReport,
} from '../../../../src/services/clockodo/entry-groups.js'
import type { ClockodoHttpClient } from '../../../../src/core/http/client.js'

async function readFixture(path: string): Promise<unknown> {
  const fixtureUrl = new URL(
    `../../../fixtures/api-responses/${path}`,
    import.meta.url,
  )
  const fixtureContents = await readFile(fixtureUrl, 'utf8')
  return JSON.parse(fixtureContents) as unknown
}

function createStubClient(fixture: unknown): ClockodoHttpClient {
  return {
    fetch: async <T>(_path: string, options: { schema: { parse(input: unknown): T } }) =>
      options.schema.parse(fixture),
  }
}

describe('createBexioBillingExport', () => {
  it('builds ready Bexio draft documents when customer mappings are present', async () => {
    const fixture = await readFixture('entry-groups/report-success.json')
    const service = new EntryGroupsService(createStubClient(fixture))
    const rows = flattenEntryGroupReport(
      await service.listReport({
        filter: {
          billable: 1,
          customersId: 10001,
        },
        grouping: ['customers_id', 'projects_id', 'services_id'],
        timeSince: '2026-01-31T23:00:00Z',
        timeUntil: '2026-02-28T22:59:59Z',
      }),
    )
    const mapping = parseBexioBillingMapping({
      customers: {
        '10001': {
          contactId: 42,
          invoice: {
            title: 'Acme AG February 2026',
            userId: 9,
          },
        },
      },
      defaults: {
        position: {
          accountId: 128,
          taxId: 14,
          unitId: 1,
        },
      },
    })

    const result = createBexioBillingExport({
      invoiceDate: '2026-03-17',
      lineGroupBy: ['project', 'service'],
      mapping,
      range: {
        label: '2026-02',
        timeSince: '2026-01-31T23:00:00Z',
        timeUntil: '2026-02-28T22:59:59Z',
      },
      rows,
    })

    expect(result.ready_document_count).toBe(1)
    expect(result.document_count).toBe(1)
    expect(result.documents).toEqual([
      {
        bexio_contact_id: 42,
        bexio_draft: {
          document: {
            apiReference:
              'clockodo:10001:2026-01-31T23:00:00Z:2026-02-28T22:59:59Z',
            contactId: 42,
            isValidFrom: '2026-03-17',
            reference: '2026-02',
            title: 'Acme AG February 2026',
            userId: 9,
          },
          positions: [
            {
              accountId: 128,
              amount: '2.00',
              taxId: 14,
              text: 'Platform / Development (2026-02)',
              type: 'custom',
              unitId: 1,
              unitPrice: '150.00',
            },
            {
              accountId: 128,
              amount: '1.00',
              taxId: 14,
              text: 'Support / Consulting (2026-02)',
              type: 'custom',
              unitId: 1,
              unitPrice: '150.00',
            },
          ],
        },
        billing_mark_billed_filter: {
          billable: 1,
          customer: 10001,
          time_since: '2026-01-31T23:00:00Z',
          time_until: '2026-02-28T22:59:59Z',
        },
        blocking_issues: [],
        customer: {
          clockodo_customer_id: 10001,
          name: 'Acme AG',
        },
        line_count: 2,
        lines: expect.arrayContaining([
          expect.objectContaining({
            label: 'Platform / Development (2026-02)',
            pricing_mode: 'hours-times-rate',
          }),
        ]),
        ready: true,
        totals: {
          duration: 10800,
          duration_hours: 3,
          revenue: 450,
        },
        warnings: [],
      },
    ])
  })

  it('falls back to flat revenue positions when the hourly rate is not stable', () => {
    const mapping = parseBexioBillingMapping({
      customers: {
        '10001': {
          contactId: 42,
        },
      },
      defaults: {
        position: {
          accountId: 128,
          taxId: 14,
          unitId: 1,
        },
      },
    })
    const result = createBexioBillingExport({
      invoiceDate: '2026-03-17',
      lineGroupBy: ['project', 'service'],
      mapping,
      range: {
        label: '2026-02',
        timeSince: '2026-01-31T23:00:00Z',
        timeUntil: '2026-02-28T22:59:59Z',
      },
      rows: [
        {
          billable: 1,
          budget_type: null,
          budget_used: false,
          customer_name: 'Acme AG',
          customers_id: 10001,
          day: null,
          duration: 5400,
          duration_hours: 1.5,
          grouped_by: 'services_id',
          group_key: '30001',
          has_budget_revenues_billed: false,
          has_budget_revenues_not_billed: false,
          has_non_budget_revenues_billed: false,
          has_non_budget_revenues_not_billed: true,
          hourly_rate: null,
          hourly_rate_is_equal_and_has_no_lumpsums: false,
          is_lumpsum: null,
          leaf_name: 'Development',
          lumpsum_service_name: null,
          lumpsum_services_id: null,
          month: null,
          path: 'customers_id:10001 > projects_id:20001 > services_id:30001',
          project_name: 'Platform',
          projects_id: 20001,
          revenue: 450,
          service_name: 'Development',
          services_id: 30001,
          subproject_name: null,
          subprojects_id: null,
          text_name: null,
          texts_id: null,
          user_name: null,
          users_id: null,
          week: null,
          year: null,
        },
      ],
    })

    expect(result.documents[0]?.ready).toBe(true)
    expect(result.documents[0]?.warnings).toEqual([
      "Line 'Platform / Development (2026-02)' uses flat revenue because Clockodo did not provide a stable hourly rate.",
    ])
    expect(result.documents[0]?.bexio_draft.positions[0]).toEqual({
      accountId: 128,
      amount: '1.00',
      taxId: 14,
      text: 'Platform / Development (2026-02)',
      type: 'custom',
      unitId: 1,
      unitPrice: '450.00',
    })
  })

  it('keeps incomplete documents visible unless ready-only is requested', () => {
    const rows = [
      {
        billable: 1,
        budget_type: null,
        budget_used: false,
        customer_name: 'Acme AG',
        customers_id: 10001,
        day: null,
        duration: 3600,
        duration_hours: 1,
        grouped_by: 'services_id',
        group_key: '30001',
        has_budget_revenues_billed: false,
        has_budget_revenues_not_billed: false,
        has_non_budget_revenues_billed: false,
        has_non_budget_revenues_not_billed: true,
        hourly_rate: 150,
        hourly_rate_is_equal_and_has_no_lumpsums: true,
        is_lumpsum: null,
        leaf_name: 'Development',
        lumpsum_service_name: null,
        lumpsum_services_id: null,
        month: null,
        path: 'customers_id:10001 > projects_id:20001 > services_id:30001',
        project_name: 'Platform',
        projects_id: 20001,
        revenue: 150,
        service_name: 'Development',
        services_id: 30001,
        subproject_name: null,
        subprojects_id: null,
        text_name: null,
        texts_id: null,
        user_name: null,
        users_id: null,
        week: null,
        year: null,
      },
    ] as const

    const fullResult = createBexioBillingExport({
      invoiceDate: '2026-03-17',
      lineGroupBy: ['project', 'service'],
      range: {
        label: '2026-02',
        timeSince: '2026-01-31T23:00:00Z',
        timeUntil: '2026-02-28T22:59:59Z',
      },
      rows,
    })
    const readyOnlyResult = createBexioBillingExport({
      invoiceDate: '2026-03-17',
      lineGroupBy: ['project', 'service'],
      range: {
        label: '2026-02',
        timeSince: '2026-01-31T23:00:00Z',
        timeUntil: '2026-02-28T22:59:59Z',
      },
      readyOnly: true,
      rows,
    })

    expect(fullResult.document_count).toBe(1)
    expect(fullResult.documents[0]?.ready).toBe(false)
    expect(fullResult.documents[0]?.blocking_issues).toEqual([
      'Missing Bexio position accountId.',
      'Missing Bexio position taxId.',
      'Missing Bexio position unitId.',
      'Missing Bexio contactId mapping for Clockodo customer 10001.',
    ])
    expect(readyOnlyResult.document_count).toBe(0)
    expect(readyOnlyResult.ready_document_count).toBe(0)
  })
})
