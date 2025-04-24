import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PlayerGame from '../pages/PlayerGame';

// 模拟useParams钩子
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ playerId: '123' }),
    useNavigate: () => mockNavigate,
  };
});

// 模拟导航函数
const mockNavigate = vi.fn();

// 模拟API调用
vi.mock('../api', () => ({
  getPlayerStatus: vi.fn(() => Promise.resolve({ started: false })),
  getPlayerQuestion: vi.fn(() => Promise.resolve(null)),
  getPlayerResults: vi.fn(() => Promise.resolve(null)),
}));

describe('PlayerGame组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该显示等待游戏开始的界面', async () => {
    render(
      <BrowserRouter>
        <PlayerGame />
      </BrowserRouter>
    );

    // 等待组件加载
    expect(await screen.findByText('Waiting for Game to Start')).toBeInTheDocument();
    expect(screen.getByText('Please wait for the admin to start the game.')).toBeInTheDocument();
  });

  it('应该有DOM元素', () => {
    const { container } = render(
      <BrowserRouter>
        <PlayerGame />
      </BrowserRouter>
    );

    // 检查是否有任何DOM元素被渲染
    expect(container.firstChild).not.toBeNull();
  });

  it('应该有正确的CSS类名', async () => {
    const { container } = render(
      <BrowserRouter>
        <PlayerGame />
      </BrowserRouter>
    );

    // 等待组件加载
    await screen.findByText('Waiting for Game to Start');

    // 检查CSS类名
    expect(container.querySelector('.waiting-screen')).toBeInTheDocument();
  });
});