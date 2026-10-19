import { connect as tlsConnect } from 'node:tls';
import { createConnection as netConnect } from 'node:net';
import { app as appConfig } from '../config/index.js';

// Private in-memory test sink for automated testing (NEVER exposed in production)
const testEmailSink = [];

export const emailService = {
  /**
   * Returns SMTP configuration from environment without leaking secrets.
   */
  getSmtpConfig() {
    return {
      provider: process.env.EMAIL_PROVIDER || 'unconfigured',
      host: process.env.SMTP_HOST || null,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      user: process.env.SMTP_USER || null,
      from: process.env.SMTP_FROM || 'no-reply@sarathi.ai',
      isConfigured: Boolean(process.env.EMAIL_PROVIDER === 'smtp' && process.env.SMTP_HOST && process.env.SMTP_USER),
    };
  },

  /**
   * Sends an email via SMTP or records to test sink in test mode.
   * Honest delivery: If SMTP is unconfigured, returns delivered: false without pretending success.
   */
  async sendEmail({ to, subject, text, html = null, throwOnUnconfigured = false }) {
    if (!to || !subject || !text) {
      throw new Error('Email destination, subject, and body text are required');
    }

    const cleanTo = to.trim().toLowerCase();
    const config = this.getSmtpConfig();
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_EMAIL_SINK === 'true';

    // In automated testing mode, record to safe in-memory test sink
    if (isTestMode) {
      testEmailSink.push({
        to: cleanTo,
        subject,
        text,
        html,
        timestamp: new Date().toISOString(),
      });
      return {
        delivered: true,
        mode: 'test_sink',
        recipient: cleanTo,
      };
    }

    // Honest check: If SMTP is not configured
    if (!config.isConfigured) {
      if (throwOnUnconfigured) {
        const err = new Error('Outbound email delivery is unconfigured. Please configure SMTP settings.');
        err.code = 'EMAIL_SERVICE_UNAVAILABLE';
        err.status = 503;
        throw err;
      }
      return {
        delivered: false,
        reason: 'unconfigured',
        recipient: cleanTo,
      };
    }

    // SMTP Socket Dispatch (Zero external dependencies)
    return new Promise((resolve, reject) => {
      try {
        const socket = config.secure
          ? tlsConnect(config.port, config.host, { rejectUnauthorized: true })
          : netConnect(config.port, config.host);

        socket.setTimeout(10000); // 10s timeout

        let stage = 'CONNECT';
        let buffer = '';

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\r\n');
          const lastLine = lines[lines.length - 2] || lines[lines.length - 1];

          if (!lastLine || lastLine.length < 3) return;
          const code = parseInt(lastLine.slice(0, 3), 10);

          if (code >= 400) {
            socket.destroy();
            return reject(new Error(`SMTP server error (${code}) at stage ${stage}`));
          }

          if (stage === 'CONNECT' && code === 220) {
            stage = 'HELO';
            socket.write(`EHLO sarathi.ai\r\n`);
          } else if (stage === 'HELO' && code === 250) {
            if (config.user && process.env.SMTP_PASS) {
              stage = 'AUTH_LOGIN';
              socket.write(`AUTH LOGIN\r\n`);
            } else {
              stage = 'MAIL_FROM';
              socket.write(`MAIL FROM:<${config.from}>\r\n`);
            }
          } else if (stage === 'AUTH_LOGIN' && code === 334) {
            stage = 'AUTH_USER';
            socket.write(`${Buffer.from(config.user).toString('base64')}\r\n`);
          } else if (stage === 'AUTH_USER' && code === 334) {
            stage = 'AUTH_PASS';
            socket.write(`${Buffer.from(process.env.SMTP_PASS || '').toString('base64')}\r\n`);
          } else if (stage === 'AUTH_PASS' && code === 235) {
            stage = 'MAIL_FROM';
            socket.write(`MAIL FROM:<${config.from}>\r\n`);
          } else if (stage === 'MAIL_FROM' && code === 250) {
            stage = 'RCPT_TO';
            socket.write(`RCPT TO:<${cleanTo}>\r\n`);
          } else if (stage === 'RCPT_TO' && code === 250) {
            stage = 'DATA';
            socket.write(`DATA\r\n`);
          } else if (stage === 'DATA' && code === 354) {
            stage = 'SEND_BODY';
            const emailContent = [
              `From: ${config.from}`,
              `To: ${cleanTo}`,
              `Subject: ${subject}`,
              `MIME-Version: 1.0`,
              `Content-Type: ${html ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8'}`,
              ``,
              html || text,
              `.`,
              ``,
            ].join('\r\n');
            socket.write(emailContent);
          } else if (stage === 'SEND_BODY' && code === 250) {
            stage = 'QUIT';
            socket.write(`QUIT\r\n`);
            socket.end();
            resolve({
              delivered: true,
              mode: 'smtp',
              recipient: cleanTo,
            });
          }
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('SMTP connection timed out after 10000ms'));
        });

        socket.on('error', (err) => {
          reject(new Error(`SMTP communication error: ${err.message}`));
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Helper to format and send Candidate Lifecycle notifications via email if enabled.
   */
  async sendCandidateNotificationEmail({ to, candidateName, title, body, actionLink = null }) {
    const subject = `[Sarathi] ${title}`;
    const text = `Hello ${candidateName || 'Candidate'},\n\n${body}\n\n${actionLink ? `View details: ${actionLink}\n\n` : ''}Best regards,\nSarathi Recruitment Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
        <p>Hello <strong>${candidateName || 'Candidate'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">${body}</p>
        ${actionLink ? `<p style="margin: 25px 0;"><a href="${actionLink}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Details</a></p>` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from the Sarathi platform.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html, throwOnUnconfigured: false });
  },

  /**
   * Test-only helper to inspect dispatched emails in automated testing.
   * Strictly throws if executed in production.
   */
  _getSentEmailsForTesting() {
    if (process.env.NODE_ENV === 'production' || appConfig.env === 'production') {
      throw new Error('Test email sink is strictly forbidden in production');
    }
    return [...testEmailSink];
  },

  /**
   * Cleans up the test email sink.
   */
  _clearTestEmailSink() {
    testEmailSink.length = 0;
  },
};
