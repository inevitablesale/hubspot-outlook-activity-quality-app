import { ObjectionDetectionService, objectionService } from '../src/services/objectionService';

describe('ObjectionDetectionService', () => {
  let service: ObjectionDetectionService;

  beforeEach(() => {
    service = new ObjectionDetectionService();
  });

  describe('detect', () => {
    it('should detect price objections', () => {
      const result = service.detect('This solution is too expensive for our budget.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'price')).toBe(true);
    });

    it('should detect timing objections', () => {
      const result = service.detect('This is not the right time for us. Maybe later.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'timing')).toBe(true);
    });

    it('should detect competition objections', () => {
      const result = service.detect('We are happy with current solution.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'competition')).toBe(true);
    });

    it('should detect authority objections', () => {
      const result = service.detect('I need to check with my boss before we proceed.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'authority')).toBe(true);
    });

    it('should detect need objections', () => {
      const result = service.detect('We don\'t need this solution right now.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'need')).toBe(true);
    });

    it('should detect trust objections', () => {
      const result = service.detect('We have never heard of your company and are not sure about this.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'trust')).toBe(true);
    });

    it('should detect implementation objections', () => {
      const result = service.detect('This seems too complex to implement.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'implementation')).toBe(true);
    });

    it('should detect feature objections', () => {
      const result = service.detect('Your product has a missing feature we need.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.some(o => o.type === 'feature')).toBe(true);
    });

    it('should return no objections for positive text', () => {
      const result = service.detect('This looks great! We are very interested in moving forward.');
      expect(result.hasObjections).toBe(false);
      expect(result.objections.length).toBe(0);
    });

    it('should detect multiple objections', () => {
      const result = service.detect('This is too expensive and not the right time. I need to check with my manager.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide suggested responses for objections', () => {
      const result = service.detect('This solution is too expensive for our budget.');
      expect(result.suggestedResponses.length).toBeGreaterThan(0);
      expect(result.suggestedResponses[0].objectionType).toBe('price');
    });

    it('should calculate overall objection level', () => {
      // Test mild objection
      service.detect('We might need to check with the team.');
      
      const strongResult = service.detect(
        'This is way too expensive, we don\'t need it, and we are happy with our current solution.'
      );
      expect(strongResult.overallObjectionLevel).not.toBe('none');
    });

    it('should include context around objections', () => {
      const result = service.detect('After our discussion, I think this is too expensive for what it offers.');
      expect(result.hasObjections).toBe(true);
      expect(result.objections[0].context).toBeDefined();
      expect(result.objections[0].context.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeConversation', () => {
    it('should aggregate objections from multiple messages', () => {
      const messages = [
        'This is too expensive for our budget.',
        'not the right time for us maybe later.',
        'need to check with my boss for approval.',
      ];
      
      const result = service.analyzeConversation(messages);
      expect(result.hasObjections).toBe(true);
      expect(result.objections.length).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate objections of the same type', () => {
      const messages = [
        'This is too expensive.',
        'The price is really too high.',
        'We can\'t afford this at all.',
      ];
      
      const result = service.analyzeConversation(messages);
      const priceObjections = result.objections.filter(o => o.type === 'price');
      expect(priceObjections.length).toBe(1); // Should be deduplicated
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(objectionService).toBeDefined();
      expect(objectionService).toBeInstanceOf(ObjectionDetectionService);
    });
  });
});
