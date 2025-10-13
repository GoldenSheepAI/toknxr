import { renderHook, act } from '@testing-library/react';
import { useTrackerForm } from '../useTrackerForm';

// Mock supabase
jest.mock('@/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    limit: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('useTrackerForm', () => {
  it('should automatically calculate totalTokens when promptTokens or completionTokens change', () => {
    const { result } = renderHook(() => useTrackerForm());

    // Initial state check
    expect(result.current.formData.totalTokens).toBe(300);

    // Change promptTokens
    act(() => {
      result.current.handleInputChange({
        target: { name: 'promptTokens', value: '150', type: 'number' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formData.promptTokens).toBe(150);
    expect(result.current.formData.totalTokens).toBe(350); // 150 + 200

    // Change completionTokens
    act(() => {
      result.current.handleInputChange({
        target: { name: 'completionTokens', value: '250', type: 'number' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formData.completionTokens).toBe(250);
    expect(result.current.formData.totalTokens).toBe(400); // 150 + 250
  });
});
