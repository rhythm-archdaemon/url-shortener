import React, { useState, useEffect } from 'react';
import { Layout, Typography, Table, Button, Card, Spin } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { ShortenUrlComponent } from '../components/ShortenUrlComponent';
import { AnalyticsComponent } from '../components/AnalyticsComponent';
import { ApiService } from '../services/ApiService';
import { type URLRecord } from '../types/Types';

const { Header, Content } = Layout;
const { Title, Link } = Typography;

export const Dashboard: React.FC = () => {
  const [links, setLinks] = useState<URLRecord[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [selectedAnalyticsKey, setSelectedAnalyticsKey] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialRecords = async () => {
      try {
        const records = await ApiService.listUrls();
        setLinks(records);
      } catch (err) {
        console.error("Failed to load link dashboard historical array:", err);
      } finally {
        setTableLoading(false);
      }
    };
    loadInitialRecords();
  }, []);

  const handleNewLink = (newLink: URLRecord) => {
    const structuredLink = { ...newLink, clicks: newLink.clicks ?? 0 };
    setLinks((prevLinks) => {
      const filteredLinks = prevLinks.filter((link) => link.id !== newLink.id);
      return [structuredLink, ...filteredLinks];
    });
  };

  const handleShortLinkClick = async (e: React.MouseEvent, record: URLRecord) => {
    e.preventDefault();
    window.open(record.original_url, '_blank', 'noopener,noreferrer');
    setLinks((prevLinks) =>
      prevLinks.map((link) =>
        link.short_url === record.short_url ? { ...link, clicks: (link.clicks ?? 0) + 1 } : link
      )
    );
    try {
      const trackingData = await ApiService.trackClick(record.short_url);
      setLinks((prevLinks) =>
        prevLinks.map((link) =>
          link.short_url === record.short_url ? { ...link, clicks: trackingData.clicks } : link
        )
      );
    } catch (err) {
      console.error("Error sync tracking clicks sync hook:", err);
    }
  };

  const toggleAnalytics = (shortUrlCode: string) => {
    setSelectedAnalyticsKey(selectedAnalyticsKey === shortUrlCode ? null : shortUrlCode);
  };

  const columns = [
    {
      title: 'Original URL',
      dataIndex: 'original_url',
      key: 'original_url',
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: '#595959', fontFamily: 'inherit' }}>{text}</span>
      ),
    },
    {
      title: 'Short URL',
      dataIndex: 'short_url',
      key: 'short_url',
      render: (shortCode: string, record: URLRecord) => (
        <Link
          href={record.original_url}
          onClick={(e) => handleShortLinkClick(e, record)}
          style={{ fontWeight: 600 }}
        >
          {shortCode}
        </Link>
      ),
    },
    {
      title: 'Clicks',
      dataIndex: 'clicks',
      key: 'clicks',
      width: 100,
      render: (count: number) => (
        <strong className="click-count">{count ?? 0}</strong>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_: any, record: URLRecord) => (
        <Button
          type={selectedAnalyticsKey === record.short_url ? 'primary' : 'default'}
          icon={<BarChartOutlined />}
          size="small"
          onClick={() => toggleAnalytics(record.short_url)}
        >
          {selectedAnalyticsKey === record.short_url ? 'Hide Stats' : 'Analytics'}
        </Button>
      ),
    },
  ];

  return (
    <Layout className="app-layout">
      {/* ── Header ── */}
      <Header className="app-header">
        <div className="app-header-inner">
          <span className="app-title-label">tool / v1.0</span>
          <Title level={1} className="app-title">
            URL Shortener&nbsp;&nbsp;+&nbsp;&nbsp; custom Sliding Log Rate Limiter
          </Title>
        </div>
      </Header>

      {/* ── Main content ── */}
      <Content style={{ width: '100%' }}>
        <div className="app-content">

          {/* Shorten form */}
          <span className="section-label">// shorten a url</span>
          <Card className="shortener-card" variant="borderless">
            <ShortenUrlComponent onLinkCreated={handleNewLink} />
          </Card>

          {/* Link table */}
          <span className="section-label">// your links</span>
          <Card className="table-card" variant="borderless">
            <Spin spinning={tableLoading} tip="Loading records...">
              <Table
                dataSource={links}
                columns={columns}
                rowKey="short_url"
                pagination={{ pageSize: 5 }}
              />
            </Spin>
          </Card>

          {/* Analytics panel */}
          <AnimatePresence mode="wait">
            {selectedAnalyticsKey && (
              <motion.div
                key={selectedAnalyticsKey}
                className="analytics-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.2 }}
              >
                <AnalyticsComponent shortUrlCode={selectedAnalyticsKey} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </Content>
    </Layout>
  );
}
