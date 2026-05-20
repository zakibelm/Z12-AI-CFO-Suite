import React from 'react';
import { AgentStudioEntry } from '../utils/agentsConfig';

interface AvatarProps {
  agent: AgentStudioEntry;
  size?: number;
  status?: 'busy' | 'done' | undefined;
  key?: string | number;
}

export default function Avatar({ agent, size = 24, status }: AvatarProps) {
  const s = size;
  const fontSize = Math.round(s * 0.38);
  const dotSize = Math.round(s * 0.28);

  const dotColor =
    status === 'busy' ? '#F59E0B' :
    status === 'done' ? '#10B981' :
    undefined;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s,
        height: s,
        borderRadius: '50%',
        background: agent.color || '#6B7280',
        color: '#fff',
        fontSize: fontSize,
        fontWeight: 700,
        fontFamily: 'inherit',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
      }}
      title={agent.name}
    >
      {agent.short}
      {dotColor && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: dotColor,
            border: '1.5px solid var(--bg-1, #1a1a2e)',
          }}
        />
      )}
    </span>
  );
}
