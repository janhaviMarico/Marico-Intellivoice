import { Injectable, OnModuleInit } from '@nestjs/common';
import { Container } from '@azure/cosmos';
import nodemailer from 'nodemailer';

@Injectable()
export class ChangeFeedService implements OnModuleInit {
  private lastCheckedTime: number;
  private readonly container: Container;

  constructor(container: Container) {
    this.container = container;
    this.lastCheckedTime = Math.floor(Date.now() / 1000); // Initialize with the current Unix timestamp
  }

  async onModuleInit() {
    await this.listenToChangeFeed();
  }

  private async listenToChangeFeed() {
    setInterval(async () => {
        try {
            console.log('Polling Cosmos DB for changes...');
            
            // Log the last checked time for debugging
            console.log('Last Checked Time:', this.lastCheckedTime);

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
                    await this.sendEmail(change);
                }

                // Update lastCheckedTime to the highest _ts value of the fetched changes
                const latestChangeTs = Math.max(...changes.map(change => change._ts));
                this.lastCheckedTime = latestChangeTs;
            } else {
                console.log('No new insertions/updates detected.');
            }
        } catch (error) {
            console.error('Error fetching changes:', error);
        }
    }, 5000); // Poll every 5 seconds
}


  private async sendEmail(change: any) {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or any other service
      auth: {
        user: 'akanksha.jadhav@atriina.com',
        pass: 'hymv zmve eyyx clpo',
      },
    });

    const mailOptions = {
      from: 'akanksha.jadhav@atriina.com',
      to: 'akankshajadhav1317@gmail.com',
      subject: 'Change Feed Notification',
      text: `A change has occurred: ${JSON.stringify(change)}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully.');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}
