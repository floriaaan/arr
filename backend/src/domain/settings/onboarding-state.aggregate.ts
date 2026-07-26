import { AggregateRoot } from '#domain/shared/aggregate-root'
import { Result } from '#domain/shared/result'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import { onboardingCompleted } from './settings.events.js'

export type OnboardingStatus = 'not_started' | 'admin_created' | 'services_configured' | 'completed'

export interface OnboardingStateProps {
  status: OnboardingStatus
  adminCreatedAt: Date | null
  servicesConfiguredAt: Date | null
  completedAt: Date | null
}

export class OnboardingState extends AggregateRoot<string> {
  private props: OnboardingStateProps

  private constructor(id: string, props: OnboardingStateProps) {
    super(id)
    this.props = props
  }

  static start(id: string): OnboardingState {
    return new OnboardingState(id, {
      status: 'not_started',
      adminCreatedAt: null,
      servicesConfiguredAt: null,
      completedAt: null,
    })
  }

  static reconstruct(id: string, props: OnboardingStateProps): OnboardingState {
    return new OnboardingState(id, props)
  }

  get status(): OnboardingStatus {
    return this.props.status
  }

  get adminCreatedAt(): Date | null {
    return this.props.adminCreatedAt
  }

  get servicesConfiguredAt(): Date | null {
    return this.props.servicesConfiguredAt
  }

  get completedAt(): Date | null {
    return this.props.completedAt
  }

  markAdminCreated(now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'not_started') {
      return Result.err({ from: this.props.status, to: 'admin_created' })
    }
    this.props.status = 'admin_created'
    this.props.adminCreatedAt = now
    return Result.ok(undefined)
  }

  markServicesConfigured(now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'admin_created') {
      return Result.err({ from: this.props.status, to: 'services_configured' })
    }
    this.props.status = 'services_configured'
    this.props.servicesConfiguredAt = now
    return Result.ok(undefined)
  }

  /**
   * `hasActiveInstance` is passed in by the caller rather than looked up here
   * — the domain stays free of repository access, cf. docs/phase-0 overview
   * point 5 (completion requires at least one enabled *arr instance).
   */
  complete(
    now: Date,
    hasActiveInstance: boolean,
  ): Result<void, InvalidTransition | 'no_active_instance'> {
    if (this.props.status !== 'services_configured') {
      return Result.err({ from: this.props.status, to: 'completed' })
    }
    if (!hasActiveInstance) {
      return Result.err('no_active_instance')
    }

    this.props.status = 'completed'
    this.props.completedAt = now
    this.record(onboardingCompleted({ completedAt: now }, now))
    return Result.ok(undefined)
  }
}
