import { CompanyPayrollReport } from '@/types/database';

export function generatePayrollCsv(report: CompanyPayrollReport): string {
  const headers = [
    'Operator Name',
    'Primary Role',
    'Total Hours',
    'Rate Display',
    'Gross Pay (£)',
    'Tax Withheld (£)',
    'Net Pay (£)',
    'Bank Account Name',
    'Bank Name',
    'Account Number',
    'Sort Code',
  ];

  const rows = report.operator_summaries.map((s) => [
    `"${s.operator.name}"`,
    `"${s.operator.primary_role}"`,
    s.total_hours.toFixed(2),
    `"${s.rate_display}"`,
    s.gross_pay.toFixed(2),
    s.tax_amount.toFixed(2),
    s.net_pay.toFixed(2),
    `"${s.operator.bank_account_name || ''}"`,
    `"${s.operator.bank_name || ''}"`,
    `"${s.operator.bank_account_number || ''}"`,
    `"${s.operator.bank_sort_code || ''}"`,
  ]);

  // Total footer row
  const footer = [
    '"TOTALS"',
    '""',
    report.total_hours.toFixed(2),
    '""',
    report.total_gross.toFixed(2),
    report.total_tax.toFixed(2),
    report.total_net.toFixed(2),
    '""',
    '""',
    '""',
    '""',
  ];

  return [headers.join(','), ...rows.map((r) => r.join(',')), footer.join(',')].join('\n');
}
