import { useState } from 'react';
import { Container, Select } from '../../../components/ui';
import { formatDateTime } from '../formatters';
import type {
  MonitoringMetric,
  MonitoringRange,
  Resource,
} from '../types';

function metricPoints(metric: MonitoringMetric, range: MonitoringRange) {
  const values = range === '1h' ? metric.values1h : metric.values24h;
  const maximum = Math.max(metric.unit === '%' ? 100 : 1, ...values);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 240;
      const y = 68 - (value / maximum) * 60;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function MonitoringPanel({
  resource,
}: Readonly<{ resource: Resource }>) {
  const [range, setRange] = useState<MonitoringRange>('1h');

  return (
    <div className="resource-monitoring">
      <Container as="section" className="resource-section">
        <div className="resource-section__heading">
          <div>
            <span>资源指标</span>
            <h3>监控概览</h3>
          </div>
          <label className="resource-monitoring__range">
            <span>时间范围</span>
            <Select
              aria-label="监控时间范围"
              options={[
                { value: '1h', label: '最近 1 小时' },
                { value: '24h', label: '最近 24 小时' },
              ]}
              value={range}
              onValueChange={(value) =>
                setRange(value === '24h' ? '24h' : '1h')
              }
            />
          </label>
        </div>
        <p className="resource-section__note">
          数据更新时间：{formatDateTime(resource.lastOperatedAt)}
        </p>
      </Container>
      <div className="resource-monitoring__grid">
        {resource.monitoring.map((metric) => (
          <Container
            as="article"
            className="resource-metric"
            key={metric.id}
          >
            <div className="resource-metric__heading">
              <span>{metric.label}</span>
              <strong>
                {metric.current}
                {metric.unit}
              </strong>
            </div>
            <svg
              viewBox="0 0 240 72"
              role="img"
              aria-label={`${metric.label}，当前 ${metric.current}${metric.unit}`}
              preserveAspectRatio="none"
            >
              <line x1="0" y1="68" x2="240" y2="68" />
              <polyline points={metricPoints(metric, range)} />
            </svg>
            <div className="resource-metric__scale" aria-hidden="true">
              <span>{range === '1h' ? '60 分钟前' : '24 小时前'}</span>
              <span>当前</span>
            </div>
          </Container>
        ))}
      </div>
      <p className="resource-section__note">
        监控数据按资源侧采集批次更新，不表示实时告警。
      </p>
    </div>
  );
}
