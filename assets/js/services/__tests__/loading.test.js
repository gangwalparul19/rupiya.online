/**
 * Loading Service Tests
 * Property-based and unit tests for skeleton screens and loading states
 * Feature: analytics-and-loading-enhancements
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import loadingService from '../loading-service.js';
import { SkeletonScreenModel } from '../analytics-models.js';

describe('LoadingService - Skeleton Screens', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    loadingService.clearAllLoadingStates();
  });

  test('should create skeleton screens with exact layout dimensions', () => {
    // Feature: analytics-and-loading-enhancements, Property 1: Skeleton Screen Layout Consistency
    // Validates: Requirements 1.6
    const contentTypes = ['dashboard', 'list', 'chart', 'form'];

    contentTypes.forEach(contentType => {
      const model = SkeletonScreenModel[contentType];
      const skeleton = loadingService.createSkeletonScreen(contentType);

      expect(skeleton.style.width).toBe(model.layout.width);
      expect(skeleton.style.height).toBe(model.layout.height);
      expect(skeleton.getAttribute('data-skeleton-type')).toBe(contentType);
    });
  });

  test('should prevent layout shift by maintaining consistent spacing', () => {
    // Feature: analytics-and-loading-enhancements, Property 1: Skeleton Screen Layout Consistency
    // Validates: Requirements 1.6
    const skeleton = loadingService.createSkeletonScreen('dashboard');

    expect(skeleton.style.padding).toBe('16px');
    expect(skeleton.style.gap).toBe('16px');
  });

  test('should create skeleton items with consistent dimensions', () => {
    // Feature: analytics-and-loading-enhancements, Property 1: Skeleton Screen Layout Consistency
    // Validates: Requirements 1.6
    const skeleton = loadingService.createSkeletonScreen('list');
    const items = skeleton.querySelectorAll('.skeleton-item');

    items.forEach(item => {
      expect(item.style.height).toBe('60px');
      expect(item.style.borderRadius).toBe('8px');
    });
  });

  test('should maintain layout consistency across all content types', () => {
    // Feature: analytics-and-loading-enhancements, Property 1: Skeleton Screen Layout Consistency
    // Validates: Requirements 1.6
    const contentTypes = ['dashboard', 'list', 'chart', 'form'];
    const skeletons = contentTypes.map(type => loadingService.createSkeletonScreen(type));

    skeletons.forEach((skeleton) => {
      expect(skeleton.classList.contains('skeleton-screen')).toBe(true);
      expect(skeleton.hasAttribute('data-skeleton-type')).toBe(true);
      expect(skeleton.style.padding).toBe('16px');
    });
  });
});

describe('LoadingService - Shimmer Animation', () => {
  test('should apply shimmer animation with correct duration', () => {
    // Feature: analytics-and-loading-enhancements, Property 2: Shimmer Animation Timing
    // Validates: Requirements 1.2
    const skeleton = loadingService.createSkeletonScreen('dashboard');
    const items = skeleton.querySelectorAll('.skeleton-item');

    items.forEach(item => {
      expect(item.style.animation).toContain('shimmer');
      expect(item.style.animation).toContain('1500ms');
      expect(item.style.animation).toContain('infinite');
    });
  });

  test('should use consistent easing function for shimmer', () => {
    // Feature: analytics-and-loading-enhancements, Property 2: Shimmer Animation Timing
    // Validates: Requirements 1.2
    const skeleton = loadingService.createSkeletonScreen('list');
    const items = skeleton.querySelectorAll('.skeleton-item');

    items.forEach(item => {
      expect(item.style.animation).toContain('ease-in-out');
    });
  });

  test('should ensure shimmer animation is added to stylesheet', () => {
    // Feature: analytics-and-loading-enhancements, Property 2: Shimmer Animation Timing
    // Validates: Requirements 1.2
    loadingService.createSkeletonScreen('chart');

    const shimmerStyle = document.getElementById('shimmer-animation-style');
    expect(shimmerStyle).toBeTruthy();
    expect(shimmerStyle.textContent).toContain('@keyframes shimmer');
  });

  test('should apply background gradient for shimmer effect', () => {
    // Feature: analytics-and-loading-enhancements, Property 2: Shimmer Animation Timing
    // Validates: Requirements 1.2
    const skeleton = loadingService.createSkeletonScreen('form');
    const items = skeleton.querySelectorAll('.skeleton-item');

    items.forEach(item => {
      expect(item.style.backgroundImage).toContain('linear-gradient');
      expect(item.style.backgroundSize).toBe('200% 100%');
    });
  });
});

describe('LoadingService - Button Loading State', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  test('should disable button and show spinner immediately when loading', () => {
    // Feature: analytics-and-loading-enhancements, Property 3: Button Loading State Atomicity
    // Validates: Requirements 1.3
    const button = document.createElement('button');
    button.textContent = 'Click me';
    container.appendChild(button);

    loadingService.setButtonLoading(button, true);

    expect(button.disabled).toBe(true);
    expect(button.classList.contains('loading')).toBe(true);
    expect(button.querySelector('.button-spinner')).toBeTruthy();
    expect(button.textContent).toContain('Loading...');
  });

  test('should restore button state when loading completes', () => {
    // Feature: analytics-and-loading-enhancements, Property 3: Button Loading State Atomicity
    // Validates: Requirements 1.3
    const button = document.createElement('button');
    const originalText = 'Click me';
    button.textContent = originalText;
    container.appendChild(button);

    loadingService.setButtonLoading(button, true);
    expect(button.disabled).toBe(true);

    loadingService.setButtonLoading(button, false);

    expect(button.disabled).toBe(false);
    expect(button.classList.contains('loading')).toBe(false);
    expect(button.textContent).toBe(originalText);
  });

  test('should maintain button state consistency across multiple toggles', () => {
    // Feature: analytics-and-loading-enhancements, Property 3: Button Loading State Atomicity
    // Validates: Requirements 1.3
    const button = document.createElement('button');
    button.textContent = 'Submit';
    container.appendChild(button);

    for (let i = 0; i < 3; i++) {
      loadingService.setButtonLoading(button, true);
      expect(button.disabled).toBe(true);

      loadingService.setButtonLoading(button, false);
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('Submit');
    }
  });

  test('should ensure spin animation exists for button spinner', () => {
    // Feature: analytics-and-loading-enhancements, Property 3: Button Loading State Atomicity
    // Validates: Requirements 1.3
    const button = document.createElement('button');
    button.textContent = 'Click';
    container.appendChild(button);

    loadingService.setButtonLoading(button, true);

    const spinStyle = document.getElementById('spin-animation-style');
    expect(spinStyle).toBeTruthy();
    expect(spinStyle.textContent).toContain('@keyframes spin');
  });
});

describe('LoadingService - Form Loading State', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  test('should disable all form inputs when loading', () => {
    // Feature: analytics-and-loading-enhancements, Property 4: Form Loading State Consistency
    // Validates: Requirements 1.4
    const form = document.createElement('form');
    const input1 = document.createElement('input');
    const input2 = document.createElement('textarea');
    const select = document.createElement('select');
    const button = document.createElement('button');
    button.type = 'submit';

    form.appendChild(input1);
    form.appendChild(input2);
    form.appendChild(select);
    form.appendChild(button);
    container.appendChild(form);

    loadingService.setFormLoading(form, true);

    expect(input1.disabled).toBe(true);
    expect(input2.disabled).toBe(true);
    expect(select.disabled).toBe(true);
    expect(button.disabled).toBe(true);
    expect(form.classList.contains('form-loading')).toBe(true);
  });

  test('should enable all form inputs when loading completes', () => {
    // Feature: analytics-and-loading-enhancements, Property 4: Form Loading State Consistency
    // Validates: Requirements 1.4
    const form = document.createElement('form');
    const input = document.createElement('input');
    const button = document.createElement('button');
    button.type = 'submit';

    form.appendChild(input);
    form.appendChild(button);
    container.appendChild(form);

    loadingService.setFormLoading(form, true);
    expect(input.disabled).toBe(true);

    loadingService.setFormLoading(form, false);

    expect(input.disabled).toBe(false);
    expect(button.disabled).toBe(false);
    expect(form.classList.contains('form-loading')).toBe(false);
  });

  test('should show loading state on submit button', () => {
    // Feature: analytics-and-loading-enhancements, Property 4: Form Loading State Consistency
    // Validates: Requirements 1.4
    const form = document.createElement('form');
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Submit';

    form.appendChild(button);
    container.appendChild(form);

    loadingService.setFormLoading(form, true);

    expect(button.classList.contains('loading')).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Loading...');
  });

  test('should prevent form resubmission by disabling submit button', () => {
    // Feature: analytics-and-loading-enhancements, Property 4: Form Loading State Consistency
    // Validates: Requirements 1.4
    const form = document.createElement('form');
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Submit';

    form.appendChild(button);
    container.appendChild(form);

    expect(button.disabled).toBe(false);

    loadingService.setFormLoading(form, true);

    expect(button.disabled).toBe(true);
  });
});

describe('LoadingService - Progressive Loading', () => {
  test('should create loading state for progressive loading', () => {
    // Feature: analytics-and-loading-enhancements, Property 5: Progressive Content Loading
    // Validates: Requirements 1.5
    const state = loadingService.createLoadingState('test-id', 'dashboard');

    expect(state).toBeTruthy();
    expect(state.contentType).toBe('dashboard');
    expect(state.isLoading).toBe(true);
    expect(state.progress).toBe(0);
    expect(state.message).toBe('Loading...');
  });

  test('should update progress for loading state', () => {
    // Feature: analytics-and-loading-enhancements, Property 5: Progressive Content Loading
    // Validates: Requirements 1.5
    const id = 'test-progress';
    loadingService.createLoadingState(id, 'dashboard');

    loadingService.updateProgress(id, 50, 'Loading data...');

    const state = loadingService.getLoadingState(id);
    expect(state.progress).toBe(50);
    expect(state.message).toBe('Loading data...');
  });

  test('should clamp progress between 0 and 100', () => {
    // Feature: analytics-and-loading-enhancements, Property 5: Progressive Content Loading
    // Validates: Requirements 1.5
    const id = 'test-clamp';
    loadingService.createLoadingState(id, 'dashboard');

    loadingService.updateProgress(id, 150);
    let state = loadingService.getLoadingState(id);
    expect(state.progress).toBe(100);

    loadingService.updateProgress(id, -50);
    state = loadingService.getLoadingState(id);
    expect(state.progress).toBe(0);
  });

  test('should complete loading state', () => {
    // Feature: analytics-and-loading-enhancements, Property 5: Progressive Content Loading
    // Validates: Requirements 1.5
    const id = 'test-complete';
    loadingService.createLoadingState(id, 'dashboard');

    loadingService.completeLoading(id);

    const state = loadingService.getLoadingState(id);
    expect(state.isLoading).toBe(false);
    expect(state.progress).toBe(100);
  });

  test('should keep page interactive during progressive loading', () => {
    // Feature: analytics-and-loading-enhancements, Property 5: Progressive Content Loading
    // Validates: Requirements 1.5
    const id = 'test-interactive';
    const state = loadingService.createLoadingState(id, 'dashboard');

    expect(state.isLoading).toBe(true);

    loadingService.updateProgress(id, 25);
    loadingService.updateProgress(id, 50);
    loadingService.updateProgress(id, 75);

    const currentState = loadingService.getLoadingState(id);
    expect(currentState.progress).toBe(75);
  });
});

describe('LoadingService - Skeleton to Content Transition', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  test('should transition from skeleton to content within 300ms', async () => {
    // Feature: analytics-and-loading-enhancements, Property 6: Skeleton to Content Transition
    // Validates: Requirements 1.7
    const skeleton = loadingService.createSkeletonScreen('dashboard');
    const content = document.createElement('div');
    content.textContent = 'Real Content';

    container.appendChild(skeleton);

    const startTime = Date.now();
    await loadingService.transitionToContent(skeleton, content);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(400);
    expect(container.contains(content)).toBe(true);
    expect(container.contains(skeleton)).toBe(false);
  });

  test('should prevent layout shift during transition', async () => {
    // Feature: analytics-and-loading-enhancements, Property 6: Skeleton to Content Transition
    // Validates: Requirements 1.7
    const skeleton = loadingService.createSkeletonScreen('list');
    const content = document.createElement('div');
    content.style.height = skeleton.style.height;
    content.style.width = skeleton.style.width;
    content.textContent = 'Content';

    container.appendChild(skeleton);

    const containerHeight = container.offsetHeight;

    await loadingService.transitionToContent(skeleton, content);

    expect(container.offsetHeight).toBe(containerHeight);
  });

  test('should apply fade animations during transition', async () => {
    // Feature: analytics-and-loading-enhancements, Property 6: Skeleton to Content Transition
    // Validates: Requirements 1.7
    const skeleton = loadingService.createSkeletonScreen('chart');
    const content = document.createElement('div');
    content.textContent = 'Chart Content';

    container.appendChild(skeleton);

    const transitionPromise = loadingService.transitionToContent(skeleton, content);

    expect(skeleton.classList.contains('skeleton-to-content-transition')).toBe(true);
    expect(content.classList.contains('content-fade-in')).toBe(true);

    await transitionPromise;
  });

  test('should handle null elements gracefully', async () => {
    // Feature: analytics-and-loading-enhancements, Property 6: Skeleton to Content Transition
    // Validates: Requirements 1.7
    await expect(loadingService.transitionToContent(null, document.createElement('div'))).resolves.toBeUndefined();
    await expect(loadingService.transitionToContent(document.createElement('div'), null)).resolves.toBeUndefined();
    await expect(loadingService.transitionToContent(null, null)).resolves.toBeUndefined();
  });
});

describe('LoadingService - Utility Methods', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    loadingService.clearAllLoadingStates();
  });

  test('should show loading skeleton in container', () => {
    loadingService.showLoading(container, 'dashboard');

    const skeleton = container.querySelector('.skeleton-screen');
    expect(skeleton).toBeTruthy();
    expect(skeleton.getAttribute('data-skeleton-type')).toBe('dashboard');
  });

  test('should hide loading and show content', async () => {
    const skeleton = loadingService.showLoading(container, 'list');
    const content = document.createElement('div');
    content.textContent = 'Real Content';

    await loadingService.hideLoading(container, content);

    expect(container.contains(content)).toBe(true);
    expect(container.contains(skeleton)).toBe(false);
  });

  test('should clear loading states', () => {
    loadingService.createLoadingState('id1', 'dashboard');
    loadingService.createLoadingState('id2', 'list');

    expect(loadingService.getLoadingState('id1')).toBeTruthy();
    expect(loadingService.getLoadingState('id2')).toBeTruthy();

    loadingService.clearLoadingState('id1');
    expect(loadingService.getLoadingState('id1')).toBeNull();
    expect(loadingService.getLoadingState('id2')).toBeTruthy();

    loadingService.clearAllLoadingStates();
    expect(loadingService.getLoadingState('id2')).toBeNull();
  });
});
