import cron from "node-cron";
import Event from "../models/Event.js";
import { sendReminderEmail } from "../utils/emailService.js";

class ReminderService {
  constructor() {
    this.scheduleDailyReminders();
  }

  scheduleDailyReminders() {
    // Run every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily event reminders check...');
      await this.checkAndSendReminders();
    });
  }

  async checkAndSendReminders() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    try {
      // Find events happening in next 24 hours
      const upcomingEvents = await Event.find({
        date: { $gte: now, $lte: tomorrow },
        remindersSent: false
      });

      for (const event of upcomingEvents) {
        // Send reminders to all registered attendees
        for (const attendee of event.attendees) {
          if (!attendee.reminderSent) {
            await sendReminderEmail(
              attendee.email,
              event,
              '24_hour_reminder'
            );
            attendee.reminderSent = true;
          }
        }

        // Mark event reminder as sent
        event.remindersSent = true;
        await event.save();

        console.log(`Reminders sent for event: ${event.title}`);
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }

  async sendWeeklyDigest() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingEvents = await Event.find({
      date: { $gte: now, $lte: nextWeek }
    }).limit(5);

    // Get all unique attendees
    const attendeesMap = new Map();
    upcomingEvents.forEach(event => {
      event.attendees.forEach(attendee => {
        if (attendee.email) {
          attendeesMap.set(attendee.email, attendee);
        }
      });
    });

    // Send weekly digest to all attendees
    for (const [email, attendee] of attendeesMap) {
      await sendReminderEmail(
        email,
        { title: 'Weekly Event Digest', events: upcomingEvents },
        'weekly_digest'
      );
    }
  }
}

export default new ReminderService();