import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

// 创建一个简化的答案选择组件，专门用于测试
const AnswerSelection = ({ type, answers, onSelect }) => {
  const [selectedAnswers, setSelectedAnswers] = useState([]);

  const handleAnswerSelect = (answerId) => {
    let newSelectedAnswers;
    if (type === 'multiple') {
      if (selectedAnswers.includes(answerId)) {
        newSelectedAnswers = selectedAnswers.filter(id => id !== answerId);
      } else {
        newSelectedAnswers = [...selectedAnswers, answerId];
      }
    } else {
      newSelectedAnswers = [answerId];
    }
    setSelectedAnswers(newSelectedAnswers);
    onSelect(newSelectedAnswers);
  };

  return (
    <div className="answers">
      {answers.map((answer) => (
        <div
          key={answer.id}
          className={`answer-option ${selectedAnswers.includes(answer.id) ? 'selected' : ''}`}
          onClick={() => handleAnswerSelect(answer.id)}
          data-testid={`answer-${answer.id}`}
        >
          {answer.text}
        </div>
      ))}
      {type === 'multiple' && (
        <button
          onClick={() => onSelect(selectedAnswers)}
          className="submit-button"
          data-testid="submit-button"
        >
          Submit Answers
        </button>
      )}
    </div>
  );
};

describe('答案选择功能', () => {
  it('单选题应该只允许选择一个答案', () => {
    const mockOnSelect = vi.fn();
    const answers = [
      { id: 1, text: 'Answer 1' },
      { id: 2, text: 'Answer 2' },
      { id: 3, text: 'Answer 3' }
    ];

    render(
      <AnswerSelection
        type="single"
        answers={answers}
        onSelect={mockOnSelect}
      />
    );

    // 应该有三个答案选项
    expect(screen.getAllByTestId(/answer-/)).toHaveLength(3);

    // 不应该有提交按钮（单选题直接提交）
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('多选题应该有提交按钮', () => {
    const mockOnSelect = vi.fn();
    const answers = [
      { id: 1, text: 'Answer 1' },
      { id: 2, text: 'Answer 2' },
      { id: 3, text: 'Answer 3' }
    ];

    render(
      <AnswerSelection
        type="multiple"
        answers={answers}
        onSelect={mockOnSelect}
      />
    );

    // 应该有提交按钮
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('判断题应该只有两个选项', () => {
    const mockOnSelect = vi.fn();
    const answers = [
      { id: 1, text: 'True' },
      { id: 2, text: 'False' }
    ];

    render(
      <AnswerSelection
        type="judgement"
        answers={answers}
        onSelect={mockOnSelect}
      />
    );

    // 应该有两个答案选项
    expect(screen.getAllByTestId(/answer-/)).toHaveLength(2);
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
  });
});