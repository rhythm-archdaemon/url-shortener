import React, { useState, useEffect, useRef } from 'react';
import { Spin, Empty, Button, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ApiService } from '../services/ApiService';
import { type AnalyticsResponse } from '../types/Types';
import Chart from 'chart.js/auto';

interface AnalyticsPageProps {
  shortUrlCode: string;
}

export const AnalyticsComponent: React.FC<AnalyticsPageProps> = ({ shortUrlCode }) => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const hasFetched = useRef(false);

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await ApiService.getAnalytics(shortUrlCode);
      setData(response);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    hasFetched.current = false;
    if (!hasFetched.current) {
      fetchAnalytics(false);
      hasFetched.current = true;
    }
  }, [shortUrlCode]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.timeline.map((item) => item.date),
        datasets: [
          {
            label: 'Total Clicks',
            data: data.timeline.map((item) => item.count),
            borderColor: '#0a0a0a',
            backgroundColor: 'rgba(10, 10, 10, 0.06)',
            borderWidth: 2,
            pointBackgroundColor: '#0a0a0a',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#0a0a0a',
            titleFont: { family: "'IBM Plex Mono', monospace", size: 11 },
            bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
            padding: 10,
            cornerRadius: 0,
          },
        },
        scales: {
          x: {
            grid: { color: '#e8e8e8', lineWidth: 1 },
            ticks: {
              font: { family: "'IBM Plex Mono', monospace", size: 11 },
              color: '#888',
            },
            border: { color: '#0a0a0a', width: 2 },
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { family: "'IBM Plex Mono', monospace", size: 11 },
              color: '#888',
            },
            grid: { display: false },
            border: { color: '#0a0a0a', width: 2 },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#888', marginTop: 12 }}>
          loading metrics...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Empty description={
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#888' }}>
            could not load analytics for this link.
          </span>
        } />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Panel header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '2px solid #0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
      }}>
        <div>
          <span style={{ fontSize: 10, color: '#999', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            // analytics
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>{shortUrlCode}</span>
        </div>
        <Tooltip title="Refresh stats">
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </Tooltip>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{
          flex: 1,
          padding: '20px 24px',
          borderRight: '1px solid #e8e8e8',
        }}>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
            Total Clicks
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}>
            {data.total_clicks}
          </div>
        </div>

        <div style={{ flex: 2, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
            Destination
          </div>
          <a
            href={data.original_url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 13,
              color: '#0a0a0a',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              wordBreak: 'break-all',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            {data.original_url}
          </a>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: '24px', background: '#fff' }}>
        <div style={{ fontSize: 10, color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>
          clicks over time
        </div>
        <div style={{ height: '260px', width: '100%' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
