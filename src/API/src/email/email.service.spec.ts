import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';
import { CommunicationLog } from '../db/communication-log/entities/communication-log.entity';

describe('EmailService (sendEmail awaiting update)', () => {
  const origCreateTransport = (nodemailer as any).createTransport;

  afterEach(() => {
    (nodemailer as any).createTransport = origCreateTransport;
    jest.restoreAllMocks();
  });

  it('awaits updateSentStatus before calling appendToSent', async () => {
    const communicationLogService: any = {
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const logger: any = { error: jest.fn(), log: jest.fn() };

    const svc = new EmailService(communicationLogService, logger);

    // mock transport to resolve immediately
    (nodemailer as any).createTransport = () => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mid-1', response: 'OK' }),
    });

    // Track call order: updateSentStatus should complete before appendToSent runs
    const order: string[] = [];

    // Replace updateSentStatus with a delayed promise
    jest.spyOn(svc as any, 'updateSentStatus').mockImplementation(() => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          order.push('update');
          resolve();
        }, 50);
      });
    });

    // Spy on appendToSent to record when it's called
    jest.spyOn(svc as any, 'appendToSent').mockImplementation(() => {
      order.push('append');
      return Promise.resolve(true);
    });

    const commLog: CommunicationLog = new CommunicationLog();
    commLog.id = 'log-1';
    commLog.subject = 's';

    await svc.sendEmail(['a@example.com'], [], 'T', 'B', undefined, commLog);

    expect(order).toEqual(['update', 'append']);
  });
});

