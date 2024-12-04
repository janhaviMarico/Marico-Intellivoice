import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Container } from '@azure/cosmos';
import nodemailer from 'nodemailer';

@Injectable()
export class ChangeFeedService implements OnModuleInit {
  private lastCheckedTime: number;
  constructor(
    @Inject('TRANSCRIPTION_CONTAINER') private readonly container: Container,
    @Inject('TARGET_GROUPS_CONTAINER') private readonly TargetGroupsContainer: Container,
    @Inject('PROJECT_CONTAINER') private readonly projectContainer: Container,
    @Inject('USER_CONTAINER') private readonly userContainer: Container,
  ) {
    this.lastCheckedTime = Math.floor(Date.now() / 1000);
  }

  // constructor(
  //   container: Container,
  //   TargetGroupsContainer: Container,
  //   projectContainer: Container,
  //   userContainer: Container
  // ) {
  //   this.container = container;
  //   this.TargetGroupsContainer = TargetGroupsContainer;
  //   this.projectContainer = projectContainer;
  //   this.userContainer = userContainer;
  //   this.lastCheckedTime = Math.floor(Date.now() / 1000); // Initialize with the current Unix timestamp
  // }

  async onModuleInit() {
    await this.listenToChangeFeed();
  }

  private async listenToChangeFeed() {
    setInterval(async () => {
      try {

        // Create the query with parameters
        const query = {
          query: 'SELECT * FROM c WHERE c._ts > @lastCheckedTime',
          parameters: [{ name: '@lastCheckedTime', value: this.lastCheckedTime }],
        };

        // Fetch changes from Cosmos DB
        const changeFeedIterator = this.container.items.query(query);
        const { resources: changes } = await changeFeedIterator.fetchNext();

        // Process the changes
        if (Array.isArray(changes) && changes.length > 0) {
          console.log(`Found ${changes.length} new insertions/updates.`);
          for (const change of changes) {
            //console.log("TGID is",change.TGId);       
            const userEmail = await this.getUserEmailByTgid(change.TGId);
            //console.log('User email is', userEmail);
            if (userEmail) {
              await this.sendEmail(change, userEmail);
            }
          }

          // Update lastCheckedTime to the highest _ts value of the fetched changes
          const latestChangeTs = Math.max(...changes.map(change => change._ts));
          this.lastCheckedTime = latestChangeTs;
        } else {
          //console.log('No new insertions/updates detected.');
        }
      } catch (error) {
        console.error('Error fetching changes:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  private async getUserEmailByTgid(TGId: string): Promise<string | null> {
    try {
      // Step 1: Retrieve project ID from targetgroups based on tgid
      const targetGroupQuery = {
        query: 'SELECT * FROM c WHERE c.TGId = @TGId',
        parameters: [{ name: '@TGId', value: TGId }],
      };
      const { resources: targetGroups } = await this.TargetGroupsContainer.items.query(targetGroupQuery).fetchNext();
      if (targetGroups.length === 0) return null;

      const ProjId = targetGroups[0].ProjId;

      // Step 2: Retrieve user ID from project based on projectId
      const projectQuery = {
        query: 'SELECT * FROM c WHERE c.ProjId = @ProjId',
        parameters: [{ name: '@ProjId', value: ProjId }],
      };

      const { resources: projects } = await this.projectContainer.items.query(projectQuery).fetchNext();
      if (projects.length === 0) return null;
      const userId = projects[0].UserId;


      // Step 3: Retrieve email from user container based on userId
      const userQuery = {
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: users } = await this.userContainer.items.query(userQuery).fetchNext();
      if (users.length === 0) return null;

      return users[0].email; // Assuming the user document has an `email` field
    } catch (error) {
      console.error('Error retrieving user email:', error);
      return null;
    }
  }

  private async sendEmail(change: any, recipientEmail: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or any other service
      auth: {
        user: 'akanksha.jadhav@atriina.com', // Add your email
        pass: 'akkskjak', // Add your password or an app-specific password
      },
    });

    const mailOptions = {
      from: 'akanksha.jadhav@atriina.com', // Add your email
      to: recipientEmail,
      subject: 'Change Feed Notification',
      text: `Hi Akanksha,\n\nA change has occurred in your portal.\nYou can view the details here: https://yourportal.com/view/${change.id}\n\nBest regards,\nYour Team`,
      html: `
        <p>Hi Akanksha,</p>
        <p>A change has occurred in your portal.</p>
        <p>You can view the details by clicking on the link below:</p>
        <a href="http://localhost:4200/portal/allFiles/audioDetails/${change.id}">View Change Details</a>
        <p>Best regards,<br>Your Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully to', recipientEmail);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}


