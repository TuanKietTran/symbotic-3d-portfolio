type Props = { label: string; value: string; unit?: string; tone?: 'green' | 'amber' }
export function Metric({ label, value, unit, tone = 'green' }: Props) {
  return <div className="metric"><span>{label}</span><strong className={tone}>{value}<small>{unit}</small></strong></div>
}
