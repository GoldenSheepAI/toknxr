import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InteractionHistory } from '../InteractionHistory';
import { Interaction } from '../../_types';

const mockInteractions: Interaction[] = [
  {
    id: '1',
    provider: 'openai',
    model: 'gpt-4',
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    costUSD: 0.01,
    taskType: 'test',
    qualityRating: 'useful',
    hallucination: false,
    timestamp: new Date(),
  },
  {
    id: '2',
    provider: 'anthropic',
    model: 'claude-3',
    promptTokens: 150,
    completionTokens: 250,
    totalTokens: 400,
    costUSD: 0.02,
    taskType: 'analysis',
    qualityRating: 'partial',
    hallucination: true,
    timestamp: new Date(),
  },
];

describe('InteractionHistory', () => {
  it('renders table with correct data', () => {
    render(<InteractionHistory interactions={mockInteractions} />);

    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('300 tokens')).toBeInTheDocument();
    expect(screen.getByText('$0.0100')).toBeInTheDocument();
    expect(screen.getAllByText('Excellent')[0]).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();

    expect(screen.getByText('claude-3')).toBeInTheDocument();
    expect(screen.getByText('400 tokens')).toBeInTheDocument();
    expect(screen.getByText('$0.0200')).toBeInTheDocument();
    expect(screen.getByText('Fair')).toBeInTheDocument();
    expect(screen.getByText('Detected')).toBeInTheDocument();
  });

  it('renders no interactions message when interactions list is empty', () => {
    render(<InteractionHistory interactions={[]} />);
    expect(screen.getByText(/No interactions recorded yet/)).toBeInTheDocument();
  });

  it('formats cost with 4 decimal places', () => {
    const interactionWithPreciseCost: Interaction[] = [
      {
        ...mockInteractions[0],
        costUSD: 0.123456789,
      },
    ];

    render(<InteractionHistory interactions={interactionWithPreciseCost} />);
    expect(screen.getByText('$0.1235')).toBeInTheDocument();
  });
});
