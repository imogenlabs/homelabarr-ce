import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { DeploymentProgressModal } from './DeploymentProgressModal';

// A stand-in for the browser's EventSource that lets a test fire named events.
class FakeEventSource {
  static last: FakeEventSource | null = null;
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  close() {}
  fire(type: string, data: unknown) {
    for (const cb of this.listeners[type] || []) {
      cb({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DeploymentProgressModal', () => {
  // HLCE-368: a failed deploy sends an error event and then a completion event.
  // The dashboard must hear about it once, with the reason, so the notice can
  // say what went wrong (e.g. the AppArmor instruction) instead of a generic hint.
  it('reports a failed deploy once, carrying the reason', () => {
    const onComplete = vi.fn();
    render(<DeploymentProgressModal deploymentId="dep1" appId="system-test" isOpen onComplete={onComplete} />);
    const es = FakeEventSource.last!;

    act(() => {
      es.fire('error', { deploymentId: 'dep1', error: 'run sudo bash scripts/install-apparmor.sh' });
      es.fire('deployment-complete', { deploymentId: 'dep1', success: false, summary: { error: 'run sudo bash scripts/install-apparmor.sh' } });
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(false, { error: 'run sudo bash scripts/install-apparmor.sh' });
  });

  it('ignores events for another deployment', () => {
    const onComplete = vi.fn();
    render(<DeploymentProgressModal deploymentId="dep1" appId="system-test" isOpen onComplete={onComplete} />);

    act(() => {
      FakeEventSource.last!.fire('deployment-complete', { deploymentId: 'other', success: true });
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
