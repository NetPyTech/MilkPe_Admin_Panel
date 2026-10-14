import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RuleBuilder, cleanRules } from '@/features/outreach/RuleBuilder';
import { metaSchema } from '@/features/outreach/schemas';
import metaJson from '../fixtures/outreach-announcements-meta.json';

const defs = metaSchema.parse(metaJson).segment_rules;

describe('cleanRules', () => {
  it('drops rules that have no value yet', () => {
    expect(cleanRules({ language: 'hi', state: '', inactive_days: ' ', never_added_supplier: true })).toEqual({ language: 'hi', never_added_supplier: true });
  });
});

describe('RuleBuilder', () => {
  it('shows each chosen filter with its value', () => {
    render(<RuleBuilder defs={defs} rules={{ language: 'hi', inactive_days: '14' }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('App language')).toHaveValue('hi');
    expect(screen.getByLabelText('Not opened the app for (days)')).toHaveValue('14');
  });
  it('adds a filter with a sensible starting value and does not offer one twice', async () => {
    const onChange = vi.fn();
    render(<RuleBuilder defs={defs} rules={{ language: 'hi' }} onChange={onChange} />);
    const add = screen.getByLabelText('Add a filter');
    expect(Array.from(add.querySelectorAll('option')).map((o) => o.textContent)).not.toContain('App language');
    await userEvent.selectOptions(add, 'never_added_supplier');
    expect(onChange).toHaveBeenCalledWith({ language: 'hi', never_added_supplier: true });
    await userEvent.selectOptions(add, 'role');
    expect(onChange).toHaveBeenLastCalledWith({ language: 'hi', role: 'buyer' });
  });
  it('changes and removes a filter', async () => {
    const onChange = vi.fn();
    render(<RuleBuilder defs={defs} rules={{ language: 'hi', state: 'Punjab' }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('App language'), 'pa');
    expect(onChange).toHaveBeenLastCalledWith({ language: 'pa', state: 'Punjab' });
    await userEvent.click(screen.getByRole('button', { name: 'Remove State' }));
    expect(onChange).toHaveBeenLastCalledWith({ language: 'hi' });
  });
  it('types a value into a text filter', async () => {
    const onChange = vi.fn();
    render(<RuleBuilder defs={defs} rules={{ state: '' }} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('State'), 'G');
    expect(onChange).toHaveBeenLastCalledWith({ state: 'G' });
  });
  it('explains a filter that needs it', () => {
    render(<RuleBuilder defs={defs} rules={{ inactive_days: '7' }} onChange={vi.fn()} />);
    expect(screen.getByText(/activity is recorded only since/i)).toBeInTheDocument();
  });
  it('says what an empty group means', () => {
    render(<RuleBuilder defs={defs} rules={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/no filters yet/i)).toBeInTheDocument();
  });
});
