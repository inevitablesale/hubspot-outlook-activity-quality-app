/**
 * HubSpot OAuth Types
 */
export interface HubSpotTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  portalId: string;
}

export interface HubSpotAuthorizationRequest {
  code: string;
  state?: string;
}

export interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * HubSpot Contact
 */
export interface HubSpotContact {
  id: string;
  properties: ContactProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface ContactProperties {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  activity_quality_score?: string;
  last_sentiment_score?: string;
  engagement_level?: string;
  last_activity_date?: string;
  objection_flags?: string;
  recommended_next_step?: string;
  [key: string]: string | undefined;
}

/**
 * HubSpot CRM Card Request
 */
export interface CRMCardRequest {
  portalId: string;
  associatedObjectId: string;
  associatedObjectType: 'CONTACT' | 'COMPANY' | 'DEAL';
  userId?: string;
  userEmail?: string;
}

/**
 * HubSpot CRM Card Response
 */
export interface CRMCardResponse {
  results: CRMCardResult[];
  primaryAction?: CRMCardAction;
  secondaryActions?: CRMCardAction[];
}

export interface CRMCardResult {
  objectId: number;
  title: string;
  link?: string;
  properties: CRMCardProperty[];
  actions?: CRMCardAction[];
}

export interface CRMCardProperty {
  label: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'DATETIME' | 'EMAIL' | 'PHONE_NUMBER' | 'CURRENCY' | 'STATUS' | 'LINK';
  value: string | number;
}

export interface CRMCardAction {
  type: 'IFRAME' | 'ACTION_HOOK' | 'CONFIRMATION_ACTION_HOOK';
  width?: number;
  height?: number;
  uri: string;
  label: string;
  associatedObjectProperties?: string[];
}

/**
 * HubSpot Timeline Event
 */
export interface TimelineEvent {
  eventTemplateId: string;
  email?: string;
  objectId?: string;
  tokens: Record<string, string | number | boolean>;
  extraData?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * HubSpot Property Update
 */
export interface PropertyUpdate {
  objectType: 'contacts' | 'companies' | 'deals';
  objectId: string;
  properties: Record<string, string | number | boolean>;
}

/**
 * HubSpot Custom Properties for Activity Quality
 */
export interface ActivityQualityProperties {
  activity_quality_score: number;
  last_sentiment_score: number;
  sentiment_trend: 'positive' | 'neutral' | 'negative';
  engagement_level: 'low' | 'medium' | 'high';
  last_activity_analyzed: string;
  total_activities_analyzed: number;
  average_response_time_hours: number;
  objection_count: number;
  recommended_action: string;
}

/**
 * Webhook Payload from HubSpot
 */
export interface HubSpotWebhookPayload {
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  eventType: string;
  attemptNumber: number;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
}
