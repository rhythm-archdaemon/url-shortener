import React, { useState, useEffect } from 'react';
import { Input, Button } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../services/ApiService';
import { type URLRecord } from '../types/Types';

interface ShortenerFormProps {
  onLinkCreated: (newLink: URLRecord) => void;
}

export const ShortenerForm: React.FC<ShortenerFormProps> = ({ onLinkCreated }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async () => {
    if (!url || cooldown > 0) return;
    setLoading(true);
    setError(null);

    try {
      const data = await ApiService.shortenUrl({ original_url: url });
      onLinkCreated(data);
      setUrl('');
    } catch (err: any) {
      const errorMsg = err.message || 'Something went wrong';
      const timeMatch = errorMsg.match(/after (\d+) seconds/);
      if (timeMatch) {
        setCooldown(parseInt(timeMatch[1], 10));
        setError('Rate limit exceeded. Cooling down...');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Input row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
        <Input
          size="large"
          placeholder="https://your-very-long-url.com/goes/right/here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPressEnter={handleSubmit}
          prefix={<LinkOutlined style={{ color: '#bbb' }} />}
          disabled={loading || cooldown > 0}
          style={{
            flex: 1,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
          }}
        />
        <Button
          size="large"
          type={cooldown > 0 ? 'default' : 'primary'}
          onClick={handleSubmit}
          loading={loading}
          disabled={!url || cooldown > 0}
          style={{ minWidth: 120, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {cooldown > 0 ? `wait ${cooldown}s` : 'Shorten →'}
        </Button>
      </div>

      {/* Error / cooldown message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              border: '2px solid #0a0a0a',
              background: cooldown > 0 ? '#f5f5f5' : '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              {/* Cooldown progress bar */}
              {cooldown > 0 && (
                <div style={{
                  width: 80,
                  height: 6,
                  background: '#e8e8e8',
                  border: '1px solid #ccc',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  <motion.div
                    style={{ height: '100%', background: '#0a0a0a' }}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: cooldown, ease: 'linear' }}
                  />
                </div>
              )}
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: '#0a0a0a',
                fontWeight: cooldown > 0 ? 400 : 600,
              }}>
                {cooldown > 0 ? `// rate limited — resuming in ${cooldown}s` : `// error: ${error}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
