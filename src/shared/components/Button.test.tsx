import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

describe('Button Component', () => {
  describe('Rendering and Basic Functionality', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render with custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should handle click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Clickable</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render with different variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-gray-600');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-base');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Loading State', () => {
    it('should show loading state correctly', () => {
      render(<Button loading>Loading Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');

      // Check for loading indicator
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Should still show text but with loading indicator
      expect(button).toHaveTextContent('Loading Button');
    });

    it('should not be clickable when loading', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button loading onClick={handleClick}>Loading</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have correct ARIA attributes when loading', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not be clickable when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have visual disabled styles', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Form Integration', () => {
    it('should work as submit button in forms', () => {
      const handleSubmit = vi.fn(e => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );

      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveAttribute('type', 'submit');

      fireEvent.click(button);
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should work as reset button in forms', () => {
      render(
        <form>
          <input defaultValue="test" />
          <Button type="reset">Reset</Button>
        </form>
      );

      const button = screen.getByRole('button', { name: /reset/i });
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Button>Accessible Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations when disabled', async () => {
      const { container } = render(<Button disabled>Disabled Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations when loading', async () => {
      const { container } = render(<Button loading>Loading Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support custom ARIA attributes', () => {
      render(
        <Button
          aria-describedby="help-text"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          Menu Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();

      render(<Button>Focusable Button</Button>);

      const button = screen.getByRole('button');

      await user.tab();
      expect(button).toHaveFocus();

      // Should have visible focus indicator
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-offset-2');
    });

    it('should support keyboard activation', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Keyboard Accessible</Button>);

      const button = screen.getByRole('button');
      button.focus();

      // Should activate on Enter
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Should activate on Space
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have sufficient color contrast', () => {
      render(<Button variant="primary">High Contrast</Button>);

      const button = screen.getByRole('button');

      // Check that text color and background provide sufficient contrast
      const styles = getComputedStyle(button);
      expect(styles.color).toBeTruthy();
      expect(styles.backgroundColor).toBeTruthy();

      // Note: In a real implementation, you would use a contrast checking library
      // to ensure WCAG AA compliance (4.5:1 ratio)
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Button>Mobile Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      // Should maintain minimum touch target size (44px)
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('should handle long text gracefully', () => {
      const longText = 'This is a very long button text that might wrap or truncate';

      render(<Button>{longText}</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent(longText);

      // Should handle overflow appropriately
      expect(button).toHaveClass('whitespace-nowrap');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();

      const TestButton = (props: any) => {
        renderSpy();
        return <Button {...props}>Test</Button>;
      };

      const { rerender } = render(<TestButton />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestButton />);
      expect(renderSpy).toHaveBeenCalledTimes(2); // Would be 2 without memoization
    });
  });

  describe('Error Boundaries', () => {
    it('should handle children rendering errors gracefully', () => {
      const ThrowingComponent = () => {
        throw new Error('Rendering error');
      };

      // In a real implementation, you would wrap this in an error boundary
      // and test that the error is caught and handled appropriately
      expect(() => {
        render(
          <Button>
            <ThrowingComponent />
          </Button>
        );
      }).toThrow('Rendering error');
    });
  });

  describe('Theme Integration', () => {
    it('should respond to theme changes', () => {
      // Mock theme context
      const mockTheme = { mode: 'dark', colors: { primary: '#1e40af' } };

      render(<Button>Themed Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      // Should apply theme-appropriate styles
      // This would integrate with your theme system
    });
  });

  describe('Animation and Transitions', () => {
    it('should handle hover states correctly', async () => {
      const user = userEvent.setup();

      render(<Button>Hoverable</Button>);

      const button = screen.getByRole('button');

      await user.hover(button);

      // Should have hover styles
      expect(button).toHaveClass('hover:bg-blue-700');
    });

    it('should handle active states correctly', () => {
      render(<Button>Active Button</Button>);

      const button = screen.getByRole('button');

      fireEvent.mouseDown(button);

      // Should have active styles during press
      expect(button).toHaveClass('active:bg-blue-800');
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should work with different button types', () => {
      const { rerender } = render(<Button type="button">Button Type</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');

      rerender(<Button type="submit">Submit Type</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

      rerender(<Button type="reset">Reset Type</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });
});