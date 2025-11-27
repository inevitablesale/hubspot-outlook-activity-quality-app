/**
 * Types for Outlook Email Activity
 */
export interface OutlookEmail {
  id: string;
  subject: string;
  body: string;
  bodyPreview?: string;
  from: EmailAddress;
  toRecipients: EmailAddress[];
  ccRecipients?: EmailAddress[];
  bccRecipients?: EmailAddress[];
  sentDateTime: string;
  receivedDateTime?: string;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
  isRead?: boolean;
  isDraft?: boolean;
  conversationId?: string;
  conversationIndex?: string;
  internetMessageId?: string;
  parentFolderId?: string;
}

export interface EmailAddress {
  emailAddress: {
    name?: string;
    address: string;
  };
}

/**
 * Types for Outlook Meeting Activity
 */
export interface OutlookMeeting {
  id: string;
  subject: string;
  body?: string;
  bodyPreview?: string;
  start: DateTimeTimeZone;
  end: DateTimeTimeZone;
  organizer: EmailAddress;
  attendees: MeetingAttendee[];
  location?: Location;
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  recurrence?: Recurrence;
  isCancelled: boolean;
  responseStatus?: ResponseStatus;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface DateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface MeetingAttendee {
  emailAddress: {
    name?: string;
    address: string;
  };
  type: 'required' | 'optional' | 'resource';
  status?: {
    response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    time?: string;
  };
}

export interface Location {
  displayName?: string;
  locationType?: string;
  address?: Address;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  countryOrRegion?: string;
  postalCode?: string;
}

export interface Recurrence {
  pattern: {
    type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
    interval: number;
    daysOfWeek?: string[];
    dayOfMonth?: number;
    month?: number;
  };
  range: {
    type: 'endDate' | 'noEnd' | 'numbered';
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  };
}

export interface ResponseStatus {
  response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
  time?: string;
}

/**
 * Activity ingestion payload
 */
export interface ActivityIngestionPayload {
  portalId: string;
  objectType: 'contact' | 'company' | 'deal';
  objectId: string;
  activityType: 'email' | 'meeting';
  activity: OutlookEmail | OutlookMeeting;
}

/**
 * Batch ingestion payload
 */
export interface BatchIngestionPayload {
  portalId: string;
  activities: ActivityIngestionPayload[];
}
