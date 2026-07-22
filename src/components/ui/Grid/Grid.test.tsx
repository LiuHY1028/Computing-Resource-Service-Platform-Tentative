import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid, GridItem } from '../index';

describe('Grid', () => {
  it('renders 24-column span combinations without absolute positioning', () => {
    render(
      <Grid data-testid="grid">
        <GridItem data-testid="main" span={16}>主区域</GridItem>
        <GridItem data-testid="side" span={8}>次区域</GridItem>
      </Grid>,
    );
    expect(screen.getByTestId('main')).toHaveStyle('--ui-grid-item-span: 16');
    expect(screen.getByTestId('side')).toHaveStyle('--ui-grid-item-span: 8');
    expect(screen.getByTestId('grid')).not.toHaveStyle('position: absolute');
  });

  it('supports start positions and rejects invalid spans', () => {
    render(<Grid><GridItem data-testid="placed" span={6} start={7}>内容</GridItem></Grid>);
    expect(screen.getByTestId('placed')).toHaveStyle('--ui-grid-item-start: 7');
    expect(() => render(<Grid><GridItem span={25}>错误</GridItem></Grid>)).toThrow(RangeError);
    expect(() => render(<Grid><GridItem span={8} start={20}>错误</GridItem></Grid>)).toThrow(RangeError);
  });
});
