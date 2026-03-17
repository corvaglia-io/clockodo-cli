import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type {
  ClockodoHttpClient,
  RequestOptions,
} from '../../../../src/core/http/client.js'
import {
  EntryGroupsService,
  flattenEntryGroupReport,
} from '../../../../src/services/clockodo/entry-groups.js'

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
    fetch: async <T>(_path: string, options: { schema: ZodType<T> }) =>
      options.schema.parse(fixture),
  }
}

function createSequenceClient(
  responses: readonly unknown[],
  calls: Array<{
    readonly body?: unknown
    readonly method: string
    readonly params?: unknown
    readonly path: string
  }>,
): ClockodoHttpClient {
  let responseIndex = 0

  return {
    fetch: async <T>(path: string, options: RequestOptions<T>) => {
      calls.push({
        body: options.body,
        method: options.method ?? 'GET',
        params: options.params,
        path,
      })

      const response = responses[responseIndex]
      responseIndex += 1

      return options.schema.parse(response) as T
    },
  }
}

describe('EntryGroupsService', () => {
  it('normalizes and flattens invoice report groups', async () => {
    const fixture = await readFixture('entry-groups/report-success.json')
    const service = new EntryGroupsService(createStubClient(fixture))
    const groups = await service.listReport({
      filter: {
        billable: 1,
        customersId: 10001,
      },
      grouping: ['customers_id', 'projects_id', 'services_id'],
      timeSince: '2026-01-31T23:00:00Z',
      timeUntil: '2026-02-28T22:59:59Z',
    })
    const rows = flattenEntryGroupReport(groups)

    expect(rows).toEqual([
      {
        billable: 1,
        budget_type: null,
        budget_used: false,
        customer_name: 'Acme AG',
        customers_id: 10001,
        day: null,
        duration: 7200,
        duration_hours: 2,
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
        revenue: 300,
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
        group_key: '30002',
        has_budget_revenues_billed: false,
        has_budget_revenues_not_billed: false,
        has_non_budget_revenues_billed: false,
        has_non_budget_revenues_not_billed: true,
        hourly_rate: 150,
        hourly_rate_is_equal_and_has_no_lumpsums: true,
        is_lumpsum: null,
        leaf_name: 'Consulting',
        lumpsum_service_name: null,
        lumpsum_services_id: null,
        month: null,
        path: 'customers_id:10001 > projects_id:20002 > services_id:30002',
        project_name: 'Support',
        projects_id: 20002,
        revenue: 150,
        service_name: 'Consulting',
        services_id: 30002,
        subproject_name: null,
        subprojects_id: null,
        text_name: null,
        texts_id: null,
        user_name: null,
        users_id: null,
        week: null,
        year: null,
      },
    ])
  })

  it('builds report requests with grouping arrays and deep filters', async () => {
    const fixture = await readFixture('entry-groups/report-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new EntryGroupsService(createSequenceClient([fixture], calls))

    await service.listReport({
      calcAlsoRevenuesForProjectsWithHardBudget: true,
      filter: {
        billable: 1,
        customersId: 10001,
      },
      grouping: ['customers_id', 'projects_id', 'services_id'],
      prependCustomerToProjectName: true,
      roundToMinutes: 15,
      timeSince: '2026-01-31T23:00:00Z',
      timeUntil: '2026-02-28T22:59:59Z',
    })

    expect(calls).toEqual([
      {
        body: undefined,
        method: 'GET',
        params: {
          'grouping[]': ['customers_id', 'projects_id', 'services_id'],
          calc_also_revenues_for_projects_with_hard_budget: true,
          filter: {
            billable: 1,
            customers_id: 10001,
          },
          prepend_customer_to_project_name: true,
          round_to_minutes: 15,
          time_since: '2026-01-31T23:00:00Z',
          time_until: '2026-02-28T22:59:59Z',
        },
        path: '/v2/entrygroups',
      },
    ])
  })

  it('marks entries billed and replays the confirm key flow', async () => {
    const confirmFixture = await readFixture('entry-groups/mark-billed-confirmation.json')
    const successFixture = await readFixture('entry-groups/mark-billed-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new EntryGroupsService(
      createSequenceClient([confirmFixture, successFixture], calls),
    )

    const confirmResult = await service.markBilled({
      filter: {
        customersId: 10001,
        projectsId: 20001,
      },
      timeSince: '2026-01-31T23:00:00Z',
      timeUntil: '2026-02-28T22:59:59Z',
    })

    expect(confirmResult).toEqual({
      affected_entries: 3,
      confirm_key: 'confirm-123',
      kind: 'confirmation_required',
    })

    const updateResult = await service.markBilled({
      confirmKey: 'confirm-123',
      filter: {
        customersId: 10001,
        projectsId: 20001,
      },
      timeSince: '2026-01-31T23:00:00Z',
      timeUntil: '2026-02-28T22:59:59Z',
    })

    expect(updateResult).toEqual({
      edited_entries: 3,
      kind: 'updated',
      success: true,
    })
    expect(calls).toEqual([
      {
        body: {
          billable: 2,
          filter: {
            customers_id: 10001,
            projects_id: 20001,
          },
          time_since: '2026-01-31T23:00:00Z',
          time_until: '2026-02-28T22:59:59Z',
        },
        method: 'PUT',
        params: undefined,
        path: '/v2/entrygroups',
      },
      {
        body: {
          billable: 2,
          confirm_key: 'confirm-123',
          filter: {
            customers_id: 10001,
            projects_id: 20001,
          },
          time_since: '2026-01-31T23:00:00Z',
          time_until: '2026-02-28T22:59:59Z',
        },
        method: 'PUT',
        params: undefined,
        path: '/v2/entrygroups',
      },
    ])
  })
})
