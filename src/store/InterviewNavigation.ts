// The one place that knows the interview flow's route sequence and their
// literal paths — every other file (guards, controller, pages) refers to
// these constants instead of typing route strings out again, so the
// sequence only has to change in one place if it ever does.

export const INTERVIEW_ROUTES = {
  dashboard: "/interview",
  setup: "/interview/setup",
  deviceCheck: "/interview/device-check",
  room: "/interview/room",
  report: "/interview/report",
} as const;

export type InterviewRouteKey = keyof typeof INTERVIEW_ROUTES;
export type InterviewRoutePath = (typeof INTERVIEW_ROUTES)[InterviewRouteKey];

const FLOW_ORDER: InterviewRouteKey[] = ["dashboard", "setup", "deviceCheck", "room", "report"];

export class InterviewNavigation {
  static routeFor(step: InterviewRouteKey): InterviewRoutePath {
    return INTERVIEW_ROUTES[step];
  }

  static nextStep(current: InterviewRouteKey): InterviewRouteKey | null {
    const index = FLOW_ORDER.indexOf(current);
    return index >= 0 && index < FLOW_ORDER.length - 1 ? FLOW_ORDER[index + 1] : null;
  }

  static previousStep(current: InterviewRouteKey): InterviewRouteKey | null {
    const index = FLOW_ORDER.indexOf(current);
    return index > 0 ? FLOW_ORDER[index - 1] : null;
  }
}
