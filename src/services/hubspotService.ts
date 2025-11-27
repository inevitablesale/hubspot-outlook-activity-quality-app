import axios from 'axios';
import { Client } from '@hubspot/api-client';
import {
  HubSpotTokens,
  HubSpotTokenResponse,
  TimelineEvent,
  PropertyUpdate,
  CRMCardRequest,
  CRMCardResponse,
  CRMCardResult,
  ActivityQualityProperties,
} from '../types/hubspot';
import { ActivityAnalysisResult } from '../types/analysis';

/**
 * In-memory token store (replace with database in production)
 */
const tokenStore = new Map<string, HubSpotTokens>();

/**
 * HubSpot Service for OAuth and API interactions
 */
export class HubSpotService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];

  constructor() {
    this.clientId = process.env.HUBSPOT_CLIENT_ID || '';
    this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET || '';
    this.redirectUri = process.env.HUBSPOT_REDIRECT_URI || '';
    this.scopes = (process.env.HUBSPOT_SCOPES || '').split(' ').filter(Boolean);
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
    });

    if (state) {
      params.append('state', state);
    }

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<HubSpotTokens> {
    const response = await axios.post<HubSpotTokenResponse>(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Get portal ID
    const tokenInfo = await this.getTokenInfo(response.data.access_token);

    const tokens: HubSpotTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + response.data.expires_in * 1000,
      portalId: tokenInfo.hub_id.toString(),
    };

    // Store tokens
    tokenStore.set(tokens.portalId, tokens);

    return tokens;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(portalId: string): Promise<HubSpotTokens> {
    const existingTokens = tokenStore.get(portalId);
    if (!existingTokens) {
      throw new Error('No tokens found for portal');
    }

    const response = await axios.post<HubSpotTokenResponse>(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: existingTokens.refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokens: HubSpotTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + response.data.expires_in * 1000,
      portalId,
    };

    tokenStore.set(portalId, tokens);

    return tokens;
  }

  /**
   * Get token info from HubSpot
   */
  private async getTokenInfo(accessToken: string): Promise<{ hub_id: number }> {
    const response = await axios.get<{ hub_id: number }>(
      'https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken
    );
    return response.data;
  }

  /**
   * Get valid access token for a portal (refreshes if needed)
   */
  async getValidAccessToken(portalId: string): Promise<string> {
    let tokens = tokenStore.get(portalId);
    if (!tokens) {
      throw new Error('No tokens found for portal');
    }

    // Refresh if token expires within 5 minutes
    if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
      tokens = await this.refreshAccessToken(portalId);
    }

    return tokens.accessToken;
  }

  /**
   * Get HubSpot API client for a portal
   */
  async getClient(portalId: string): Promise<Client> {
    const accessToken = await this.getValidAccessToken(portalId);
    return new Client({ accessToken });
  }

  /**
   * Check if portal is connected
   */
  isConnected(portalId: string): boolean {
    return tokenStore.has(portalId);
  }

  /**
   * Disconnect portal
   */
  disconnect(portalId: string): void {
    tokenStore.delete(portalId);
  }

  /**
   * Store tokens (for external token management)
   */
  storeTokens(tokens: HubSpotTokens): void {
    tokenStore.set(tokens.portalId, tokens);
  }

  /**
   * Create timeline event
   */
  async createTimelineEvent(
    portalId: string,
    event: TimelineEvent
  ): Promise<void> {
    const client = await this.getClient(portalId);
    
    // Convert tokens to string values for HubSpot API
    const stringTokens = Object.entries(event.tokens).reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {} as Record<string, string>
    );
    
    await client.crm.timeline.eventsApi.create({
      eventTemplateId: event.eventTemplateId,
      email: event.email,
      objectId: event.objectId,
      tokens: stringTokens,
      extraData: event.extraData,
      timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
    });
  }

  /**
   * Update contact/company/deal properties
   */
  async updateProperties(portalId: string, update: PropertyUpdate): Promise<void> {
    const client = await this.getClient(portalId);

    const properties = Object.entries(update.properties).reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {} as Record<string, string>
    );

    switch (update.objectType) {
      case 'contacts':
        await client.crm.contacts.basicApi.update(update.objectId, { properties });
        break;
      case 'companies':
        await client.crm.companies.basicApi.update(update.objectId, { properties });
        break;
      case 'deals':
        await client.crm.deals.basicApi.update(update.objectId, { properties });
        break;
    }
  }

  /**
   * Update activity quality properties on a contact
   */
  async updateActivityQualityProperties(
    portalId: string,
    contactId: string,
    analysis: ActivityAnalysisResult
  ): Promise<void> {
    const properties: Partial<ActivityQualityProperties> = {
      activity_quality_score: analysis.qualityScore.overallScore,
      last_sentiment_score: analysis.sentiment.sentimentScore,
      sentiment_trend: analysis.sentiment.overallSentiment,
      engagement_level: this.mapScoreToEngagementLevel(analysis.qualityScore.breakdown.engagementScore),
      last_activity_analyzed: analysis.analyzedAt,
      objection_count: analysis.objections.objections.length,
      recommended_action: analysis.nextSteps[0]?.action || 'nurture',
    };

    await this.updateProperties(portalId, {
      objectType: 'contacts',
      objectId: contactId,
      properties,
    });
  }

  /**
   * Map score to engagement level
   */
  private mapScoreToEngagementLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Build CRM card response from analysis
   */
  buildCRMCardResponse(
    request: CRMCardRequest,
    analysis: ActivityAnalysisResult | null
  ): CRMCardResponse {
    if (!analysis) {
      return {
        results: [{
          objectId: parseInt(request.associatedObjectId),
          title: 'Activity Quality Score',
          properties: [
            {
              label: 'Status',
              dataType: 'STRING',
              value: 'No activities analyzed yet',
            },
          ],
        }],
      };
    }

    const result: CRMCardResult = {
      objectId: parseInt(request.associatedObjectId),
      title: `Activity Quality: ${analysis.qualityScore.grade}`,
      properties: [
        {
          label: 'Quality Score',
          dataType: 'NUMBER',
          value: analysis.qualityScore.overallScore,
        },
        {
          label: 'Sentiment',
          dataType: 'STATUS',
          value: this.formatSentiment(analysis.sentiment.overallSentiment),
        },
        {
          label: 'Sentiment Score',
          dataType: 'NUMBER',
          value: analysis.sentiment.sentimentScore,
        },
        {
          label: 'Engagement',
          dataType: 'NUMBER',
          value: analysis.qualityScore.breakdown.engagementScore,
        },
        {
          label: 'Responsiveness',
          dataType: 'NUMBER',
          value: analysis.qualityScore.breakdown.responsivenessScore,
        },
        {
          label: 'Objections',
          dataType: 'STRING',
          value: analysis.objections.hasObjections 
            ? `${analysis.objections.objections.length} detected (${analysis.objections.overallObjectionLevel})`
            : 'None detected',
        },
        {
          label: 'Next Step',
          dataType: 'STRING',
          value: this.formatNextStep(analysis.nextSteps[0]?.action),
        },
        {
          label: 'Urgency',
          dataType: 'STATUS',
          value: this.formatUrgency(analysis.sentiment.urgencyLevel),
        },
      ],
    };

    // Add reply depth info if available
    if (analysis.replyDepth) {
      result.properties.push({
        label: 'Thread Depth',
        dataType: 'NUMBER',
        value: analysis.replyDepth.threadLength,
      });
      result.properties.push({
        label: 'Avg Response Time',
        dataType: 'STRING',
        value: `${analysis.replyDepth.averageResponseTime} hours`,
      });
    }

    return {
      results: [result],
    };
  }

  /**
   * Format sentiment for display
   */
  private formatSentiment(sentiment: string): string {
    const map: Record<string, string> = {
      positive: '✅ Positive',
      neutral: '➖ Neutral',
      negative: '⚠️ Negative',
    };
    return map[sentiment] || sentiment;
  }

  /**
   * Format next step action for display
   */
  private formatNextStep(action?: string): string {
    if (!action) return 'Continue nurturing';
    
    const map: Record<string, string> = {
      follow_up_call: '📞 Follow-up call',
      send_email: '📧 Send email',
      schedule_meeting: '📅 Schedule meeting',
      send_proposal: '📄 Send proposal',
      address_objection: '💬 Address objection',
      provide_demo: '🖥️ Provide demo',
      share_case_study: '📊 Share case study',
      escalate: '⬆️ Escalate',
      nurture: '🌱 Continue nurturing',
      close_deal: '🎯 Close deal',
      re_engage: '🔄 Re-engage',
    };
    return map[action] || action;
  }

  /**
   * Format urgency for display
   */
  private formatUrgency(urgency: string): string {
    const map: Record<string, string> = {
      low: '🟢 Low',
      medium: '🟡 Medium',
      high: '🟠 High',
      critical: '🔴 Critical',
    };
    return map[urgency] || urgency;
  }

  /**
   * Create custom properties in HubSpot (for setup)
   */
  async createActivityQualityProperties(portalId: string): Promise<void> {
    const client = await this.getClient(portalId);

    interface PropertyOption {
      label: string;
      value: string;
      hidden: boolean;
    }

    interface PropertyDef {
      name: string;
      label: string;
      type: string;
      fieldType: string;
      groupName: string;
      description: string;
      options?: PropertyOption[];
    }

    const properties: PropertyDef[] = [
      {
        name: 'activity_quality_score',
        label: 'Activity Quality Score',
        type: 'number',
        fieldType: 'number',
        groupName: 'activity_quality',
        description: 'Overall activity quality score (0-100)',
      },
      {
        name: 'last_sentiment_score',
        label: 'Last Sentiment Score',
        type: 'number',
        fieldType: 'number',
        groupName: 'activity_quality',
        description: 'Sentiment score from last analyzed activity (0-100)',
      },
      {
        name: 'sentiment_trend',
        label: 'Sentiment Trend',
        type: 'enumeration',
        fieldType: 'select',
        groupName: 'activity_quality',
        description: 'Overall sentiment trend',
        options: [
          { label: 'Positive', value: 'positive', hidden: false },
          { label: 'Neutral', value: 'neutral', hidden: false },
          { label: 'Negative', value: 'negative', hidden: false },
        ],
      },
      {
        name: 'engagement_level',
        label: 'Engagement Level',
        type: 'enumeration',
        fieldType: 'select',
        groupName: 'activity_quality',
        description: 'Current engagement level',
        options: [
          { label: 'High', value: 'high', hidden: false },
          { label: 'Medium', value: 'medium', hidden: false },
          { label: 'Low', value: 'low', hidden: false },
        ],
      },
      {
        name: 'last_activity_analyzed',
        label: 'Last Activity Analyzed',
        type: 'datetime',
        fieldType: 'date',
        groupName: 'activity_quality',
        description: 'Timestamp of last analyzed activity',
      },
      {
        name: 'total_activities_analyzed',
        label: 'Total Activities Analyzed',
        type: 'number',
        fieldType: 'number',
        groupName: 'activity_quality',
        description: 'Total number of activities analyzed',
      },
      {
        name: 'average_response_time_hours',
        label: 'Average Response Time (Hours)',
        type: 'number',
        fieldType: 'number',
        groupName: 'activity_quality',
        description: 'Average response time in hours',
      },
      {
        name: 'objection_count',
        label: 'Objection Count',
        type: 'number',
        fieldType: 'number',
        groupName: 'activity_quality',
        description: 'Number of objections detected',
      },
      {
        name: 'recommended_action',
        label: 'Recommended Action',
        type: 'string',
        fieldType: 'text',
        groupName: 'activity_quality',
        description: 'Recommended next action',
      },
    ];

    // First create property group
    try {
      await client.crm.properties.groupsApi.create('contacts', {
        name: 'activity_quality',
        label: 'Activity Quality',
        displayOrder: 1,
      });
    } catch (error: unknown) {
      // Group might already exist
      console.log('Property group might already exist:', (error as Error).message);
    }

    // Create each property
    for (const prop of properties) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propertyCreate: any = {
          name: prop.name,
          label: prop.label,
          type: prop.type,
          fieldType: prop.fieldType,
          groupName: prop.groupName,
          description: prop.description,
        };
        
        if (prop.options) {
          propertyCreate.options = prop.options;
        }
        
        await client.crm.properties.coreApi.create('contacts', propertyCreate);
      } catch (error: unknown) {
        // Property might already exist
        console.log(`Property ${prop.name} might already exist:`, (error as Error).message);
      }
    }
  }
}

export const hubspotService = new HubSpotService();
