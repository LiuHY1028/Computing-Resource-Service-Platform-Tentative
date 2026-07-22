import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from '../index';

describe('Container', () => {
  it('renders semantic variants without applying a shadow by default', () => {
    render(<Container variant="success">成功容器</Container>);
    const container = screen.getByText('成功容器');
    expect(container).toHaveAttribute('data-variant', 'success');
    expect(container).toHaveAttribute('data-shadow', 'none');
  });

  it('supports a semantic element, explicit shadow, className and ref', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Container
        ref={ref}
        as="section"
        className="extension-class"
        shadow="dropdown"
      >
        语义容器
      </Container>,
    );
    const container = screen.getByText('语义容器');
    expect(container.tagName).toBe('SECTION');
    expect(container).toHaveClass('extension-class');
    expect(container).toHaveAttribute('data-shadow', 'dropdown');
    expect(ref.current).toBe(container);
  });
});
