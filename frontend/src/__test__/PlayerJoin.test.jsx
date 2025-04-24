import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PlayerJoin from '../pages/PlayerJoin';

// 模拟useParams钩子
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ sessionId: '456' }),
    useNavigate: () => mockNavigate,
  };
});

// 模拟导航函数
const mockNavigate = vi.fn();

// 模拟API调用
vi.mock('../api', () => ({
  joinGame: vi.fn(() => Promise.resolve({ playerId: '123' })),
}));

describe('PlayerJoin组件', () => {
  it('应该显示会话ID', () => {
    render(
      <BrowserRouter>
        <PlayerJoin />
      </BrowserRouter>
    );

    expect(screen.getByText(/Session: 456/i)).toBeInTheDocument();
  });

  it('应该有名称输入框', () => {
    render(
      <BrowserRouter>
        <PlayerJoin />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Your Name:/i)).toBeInTheDocument();
  });

  it('应该有加入游戏按钮', () => {
    render(
      <BrowserRouter>
        <PlayerJoin />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Join Game/i })).toBeInTheDocument();
  });
});