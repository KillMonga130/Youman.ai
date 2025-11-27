/**
 * Tone and Sentiment Analysis Service Tests
 * Tests for sentiment analysis, tone adjustment, and emotional detection
 * Requirements: 32, 47, 108, 116
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToneService } from './tone.service';
import { ToneAdjustment, SentimentTarget } from './types';

describe('ToneService', () => {
  let toneService: ToneService;

  beforeEach(() => {
    toneService = new ToneService();
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment correctly', async () => {
      const text = 'This is an excellent and amazing product. I love it!';
      const result = await toneService.analyzeSentiment(text);

      expect(result.overall).toBe('positive');
      expect(result.emotions.joy).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should analyze negative sentiment correctly', async () => {
      const text = 'This is terrible and awful. I hate it completely.';
      const result = await toneService.analyzeSentiment(text);

      expect(result.overall).toBe('negative');
      expect(result.emotions.anger).toBeGreaterThan(0);
    });

    it('should analyze neutral sentiment correctly', async () => {
      const text = 'The meeting is scheduled for tomorrow at noon.';
      const result = await toneService.analyzeSentiment(text);

      expect(result.overall).toBe('neutral');
    });

    it('should handle empty text gracefully', async () => {
      const text = '';
      const result = await toneService.analyzeSentiment(text);

      expect(result.overall).toBe('neutral');
      expect(result.intensity).toBe(0);
    });

    it('should detect tone category', async () => {
      const formalText = 'Furthermore, it should be noted that the implementation thereof is hereby approved.';
      const result = await toneService.analyzeSentiment(formalText);

      expect(result.tone).toBe('formal');
    });
  });


  describe('adjustTone', () => {
    it('should adjust tone from formal to casual', async () => {
      const text = 'Therefore, we must utilize this opportunity to implement the solution.';
      const adjustment: ToneAdjustment = {
        from: 'formal',
        to: 'casual',
        intensity: 50,
      };

      const result = await toneService.adjustTone(text, adjustment);

      expect(result.success).toBe(true);
      expect(result.adjustedText).not.toBe(text);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should adjust tone from casual to formal', async () => {
      const text = 'So we gotta use this chance to do the thing.';
      const adjustment: ToneAdjustment = {
        from: 'casual',
        to: 'formal',
        intensity: 50,
      };

      const result = await toneService.adjustTone(text, adjustment);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should track changes made during adjustment', async () => {
      const text = 'Furthermore, we should utilize this method.';
      const adjustment: ToneAdjustment = {
        from: 'formal',
        to: 'casual',
        intensity: 50,
      };

      const result = await toneService.adjustTone(text, adjustment);

      expect(result.changes).toBeInstanceOf(Array);
      for (const change of result.changes) {
        expect(change).toHaveProperty('original');
        expect(change).toHaveProperty('replacement');
        expect(change).toHaveProperty('reason');
      }
    });

    it('should preserve text when no transformations apply', async () => {
      const text = 'Hello world.';
      const adjustment: ToneAdjustment = {
        from: 'neutral',
        to: 'neutral',
        intensity: 50,
      };

      const result = await toneService.adjustTone(text, adjustment);

      expect(result.success).toBe(true);
      expect(result.adjustedText).toBe(text);
    });
  });

  describe('detectEmotionalDimensions', () => {
    it('should detect primary emotion', async () => {
      const text = 'I am so happy and excited about this wonderful news!';
      const result = await toneService.detectEmotionalDimensions(text);

      expect(result.primaryEmotion).toBeDefined();
      expect(result.emotions.joy).toBeGreaterThan(0);
    });

    it('should calculate emotional arc for longer text', async () => {
      const text = `
        The beginning was exciting and full of hope.
        Then things became more challenging and difficult.
        But in the end, everything worked out wonderfully.
        We were all thrilled with the amazing outcome.
      `;
      const result = await toneService.detectEmotionalDimensions(text, {
        includeEmotionalArc: true,
        arcSegments: 4,
      });

      expect(result.emotionalArc.length).toBeGreaterThan(0);
      expect(result.stability).toBeGreaterThanOrEqual(0);
      expect(result.stability).toBeLessThanOrEqual(1);
    });

    it('should determine emotional valence', async () => {
      const positiveText = 'This is wonderful, amazing, and delightful!';
      const result = await toneService.detectEmotionalDimensions(positiveText);

      expect(['positive', 'mixed', 'neutral']).toContain(result.valence);
    });

    it('should calculate overall intensity', async () => {
      const intenseText = 'I absolutely love this! It is fantastic and brilliant!';
      const result = await toneService.detectEmotionalDimensions(intenseText);

      expect(result.overallIntensity).toBeGreaterThanOrEqual(0);
      expect(result.overallIntensity).toBeLessThanOrEqual(1);
    });
  });


  describe('validateToneConsistency', () => {
    it('should detect consistent tone', async () => {
      const text = `
        Furthermore, it is important to note the significance of this matter.
        Moreover, one must consider the implications thereof.
        Consequently, we shall proceed with the implementation.
      `;
      const result = await toneService.validateToneConsistency(text);

      expect(result.consistencyScore).toBeGreaterThan(0);
      expect(result.isConsistent).toBeDefined();
    });

    it('should detect tone shifts', async () => {
      const text = `
        Furthermore, it is imperative that we consider the ramifications.
        
        Hey, so like, this is totally cool and stuff!
        
        Nevertheless, the aforementioned considerations remain paramount.
      `;
      const result = await toneService.validateToneConsistency(text);

      expect(result.toneShifts.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for inconsistent text', async () => {
      const text = `
        The formal analysis indicates significant findings.
        
        Yo, this is super awesome and rad!
        
        In conclusion, the data supports our hypothesis.
      `;
      const result = await toneService.validateToneConsistency(text);

      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should identify inconsistent segments', async () => {
      const text = `
        This is a professional business document.
        We analyze market trends carefully.
        
        OMG this is so cool lol!!!
        
        The quarterly results show improvement.
      `;
      const result = await toneService.validateToneConsistency(text);

      if (result.inconsistentSegments.length > 0) {
        const segment = result.inconsistentSegments[0];
        expect(segment).toHaveProperty('expectedTone');
        expect(segment).toHaveProperty('actualTone');
        expect(segment).toHaveProperty('suggestion');
      }
    });
  });

  describe('targetSentiment', () => {
    it('should target positive sentiment', async () => {
      const text = 'This is an okay product with some features.';
      const target: SentimentTarget = {
        targetSentiment: 'positive',
        targetIntensity: 0.7,
        tolerance: 0.2,
      };

      const result = await toneService.targetSentiment(text, target);

      expect(result.success).toBe(true);
      expect(result.targetAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.targetAccuracy).toBeLessThanOrEqual(1);
    });

    it('should target neutral sentiment', async () => {
      const text = 'This is absolutely amazing and wonderful!';
      const target: SentimentTarget = {
        targetSentiment: 'neutral',
        targetIntensity: 0.3,
        tolerance: 0.3,
      };

      const result = await toneService.targetSentiment(text, target);

      expect(result.success).toBe(true);
      expect(result.achievedSentiment).toBeDefined();
    });

    it('should calculate target accuracy', async () => {
      const text = 'The meeting is scheduled for tomorrow.';
      const target: SentimentTarget = {
        targetSentiment: 'positive',
        targetIntensity: 0.5,
        tolerance: 0.2,
      };

      const result = await toneService.targetSentiment(text, target);

      expect(result.targetAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.targetAccuracy).toBeLessThanOrEqual(1);
    });

    it('should target specific emotions', async () => {
      const text = 'This is a regular statement about something.';
      const target: SentimentTarget = {
        targetSentiment: 'positive',
        targetIntensity: 0.6,
        tolerance: 0.2,
        targetEmotions: {
          joy: 0.7,
          trust: 0.5,
        },
      };

      const result = await toneService.targetSentiment(text, target);

      expect(result.success).toBe(true);
      expect(result.achievedSentiment.emotions).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very short text', async () => {
      const text = 'Hi';
      const result = await toneService.analyzeSentiment(text);

      expect(result).toBeDefined();
      expect(result.wordCount).toBe(1);
    });

    it('should handle text with special characters', async () => {
      const text = 'This is great!!! @#$% Amazing... ???';
      const result = await toneService.analyzeSentiment(text);

      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
    });

    it('should handle text with numbers', async () => {
      const text = 'The product costs $99.99 and has 5 stars.';
      const result = await toneService.analyzeSentiment(text);

      expect(result).toBeDefined();
    });

    it('should handle mixed language indicators', async () => {
      const text = 'This is kinda formal but also sorta casual, nevertheless.';
      const result = await toneService.analyzeSentiment(text);

      expect(result.tone).toBeDefined();
    });
  });
});
